import { Router } from 'express';
import multer from 'multer';
import path from 'node:path';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import { prisma } from '../db.js';
import { config } from '../config.js';
import { authRequired } from '../auth.js';
import { generateImage, getProviderConfig } from '../services/provider.js';

const r = Router();
const upload = multer({
  storage: multer.diskStorage({
    destination: path.join(config.uploadDir, 'inputs'),
    filename: (_req, file, cb) => cb(null, `${Date.now()}-${crypto.randomUUID()}${path.extname(file.originalname).toLowerCase() || '.jpg'}`),
  }),
  limits: { fileSize: config.maxUploadMb * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = ['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype);
    cb(ok ? null : new Error('Only JPG, PNG or WebP photos are allowed'), ok);
  },
});

function serialize(g) {
  return {
    id: g.id,
    status: g.status,
    error: g.error,
    provider: g.provider,
    demo: g.demo,
    type: g.type ? { id: g.type.id, name: g.type.name } : undefined,
    style: g.style ? { id: g.style.id, name: g.style.name } : undefined,
    inputUrl: `/api/files/inputs/${path.basename(g.inputPath)}`,
    outputUrl: g.outputPath ? `/api/files/outputs/${path.basename(g.outputPath)}` : null,
    createdAt: g.createdAt,
    completedAt: g.completedAt,
  };
}

r.get('/provider-status', authRequired, async (_req, res) => {
  const cfg = await getProviderConfig();
  res.json({ provider: cfg.provider, demo: cfg.provider === 'mock', model: cfg.model || null });
});

r.post('/', authRequired, upload.single('photo'), async (req, res) => {
  try {
    const { typeId, styleId } = req.body || {};
    if (!req.file) return res.status(400).json({ error: 'Please upload a photo of your jewellery piece' });
    const [type, style] = await Promise.all([
      prisma.jewelleryType.findFirst({ where: { id: typeId, active: true } }),
      prisma.style.findFirst({ where: { id: styleId, active: true } }),
    ]);
    if (!type) return res.status(400).json({ error: 'Choose a jewellery type' });
    if (!style) return res.status(400).json({ error: 'Choose a style' });
    if (req.user.credits < 1) return res.status(402).json({ error: 'You are out of credits. Ask the admin to top up your account.' });

    const generation = await prisma.generation.create({
      data: { userId: req.user.id, typeId: type.id, styleId: style.id, inputPath: req.file.path },
      include: { type: true, style: true },
    });

    // Process in-process (async); the client polls for status.
    processGeneration(generation.id).catch(() => {});
    res.status(201).json({ generation: serialize(generation) });
  } catch (e) {
    res.status(400).json({ error: e.message || 'Could not start generation' });
  }
});

async function processGeneration(id) {
  const g = await prisma.generation.findUnique({ where: { id }, include: { type: true, style: true, user: true } });
  if (!g) return;
  await prisma.generation.update({ where: { id }, data: { status: 'PROCESSING' } });
  try {
    const prompt = g.style.promptTemplate.replaceAll('{type}', g.type.name.toLowerCase());
    const { buffer, provider, demo } = await generateImage({ prompt, inputImagePath: g.inputPath });
    const outName = `${id}.jpg`;
    const outPath = path.join(config.uploadDir, 'outputs', outName);
    await fs.writeFile(outPath, buffer);
    await prisma.$transaction([
      prisma.generation.update({
        where: { id },
        data: { status: 'COMPLETED', outputPath: outPath, provider, demo, completedAt: new Date() },
      }),
      prisma.user.update({ where: { id: g.userId }, data: { credits: { decrement: 1 } } }),
    ]);
  } catch (e) {
    await prisma.generation.update({ where: { id }, data: { status: 'FAILED', error: e.message || 'Generation failed' } });
  }
}

r.get('/', authRequired, async (req, res) => {
  const generations = await prisma.generation.findMany({
    where: { userId: req.user.id },
    orderBy: { createdAt: 'desc' },
    include: { type: true, style: true },
    take: 100,
  });
  res.json({ generations: generations.map(serialize) });
});

r.get('/:id', authRequired, async (req, res) => {
  const g = await prisma.generation.findFirst({
    where: { id: req.params.id, userId: req.user.id },
    include: { type: true, style: true },
  });
  if (!g) return res.status(404).json({ error: 'Not found' });
  res.json({ generation: serialize(g) });
});

export default r;
