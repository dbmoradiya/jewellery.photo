import { Router } from 'express';
import multer from 'multer';
import path from 'node:path';
import crypto from 'node:crypto';
import { prisma } from '../db.js';
import { config } from '../config.js';
import { authRequired, adminRequired } from '../auth.js';
import { getProviderConfig } from '../services/provider.js';

const r = Router();
r.use(authRequired, adminRequired);

const previewUpload = multer({
  storage: multer.diskStorage({
    destination: path.join(config.uploadDir, 'previews'),
    filename: (_req, file, cb) => cb(null, `${Date.now()}-${crypto.randomUUID()}${path.extname(file.originalname).toLowerCase() || '.jpg'}`),
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = ['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype);
    cb(ok ? null : new Error('Only JPG, PNG or WebP images are allowed'), ok);
  },
});

function slugify(s) {
  return String(s).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

// --- Dashboard ---
r.get('/stats', async (_req, res) => {
  const [users, generations, completed, failed, types, styles] = await Promise.all([
    prisma.user.count(),
    prisma.generation.count(),
    prisma.generation.count({ where: { status: 'COMPLETED' } }),
    prisma.generation.count({ where: { status: 'FAILED' } }),
    prisma.jewelleryType.count(),
    prisma.style.count(),
  ]);
  res.json({ users, generations, completed, failed, types, styles });
});

// --- Jewellery types ---
r.get('/types', async (_req, res) => {
  res.json({ types: await prisma.jewelleryType.findMany({ orderBy: [{ sort: 'asc' }, { name: 'asc' }] }) });
});
r.post('/types', async (req, res) => {
  const { name } = req.body || {};
  if (!name?.trim()) return res.status(400).json({ error: 'Name is required' });
  const slug = slugify(name);
  if (await prisma.jewelleryType.findUnique({ where: { slug } })) return res.status(409).json({ error: 'A type with this name already exists' });
  const type = await prisma.jewelleryType.create({ data: { name: name.trim(), slug, sort: parseInt(req.body.sort) || 0 } });
  res.status(201).json({ type });
});
r.patch('/types/:id', async (req, res) => {
  const { name, active, sort } = req.body || {};
  const data = {};
  if (name !== undefined) { data.name = String(name).trim(); data.slug = slugify(name); }
  if (active !== undefined) data.active = Boolean(active);
  if (sort !== undefined) data.sort = parseInt(sort) || 0;
  try {
    res.json({ type: await prisma.jewelleryType.update({ where: { id: req.params.id }, data }) });
  } catch { res.status(404).json({ error: 'Type not found' }); }
});
r.delete('/types/:id', async (req, res) => {
  const used = await prisma.generation.count({ where: { typeId: req.params.id } });
  if (used) return res.status(409).json({ error: 'This type is used by existing generations; deactivate it instead' });
  await prisma.jewelleryType.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

// --- Styles (designs + prompts) ---
r.get('/styles', async (_req, res) => {
  const styles = await prisma.style.findMany({ orderBy: [{ sort: 'asc' }, { name: 'asc' }] });
  res.json({ styles: styles.map((s) => ({ ...s, previewUrl: s.previewImage ? `/api/files/previews/${path.basename(s.previewImage)}` : null })) });
});
r.post('/styles', previewUpload.single('preview'), async (req, res) => {
  const { name, promptTemplate } = req.body || {};
  if (!name?.trim()) return res.status(400).json({ error: 'Name is required' });
  if (!promptTemplate?.trim()) return res.status(400).json({ error: 'Prompt template is required' });
  const slug = slugify(name);
  if (await prisma.style.findUnique({ where: { slug } })) return res.status(409).json({ error: 'A style with this name already exists' });
  const style = await prisma.style.create({
    data: {
      name: name.trim(), slug, promptTemplate: promptTemplate.trim(),
      sort: parseInt(req.body.sort) || 0,
      previewImage: req.file ? req.file.path : null,
    },
  });
  res.status(201).json({ style });
});
r.patch('/styles/:id', previewUpload.single('preview'), async (req, res) => {
  const data = {};
  const { name, promptTemplate, active, sort } = req.body || {};
  if (name !== undefined) { data.name = String(name).trim(); data.slug = slugify(name); }
  if (promptTemplate !== undefined) data.promptTemplate = String(promptTemplate).trim();
  if (active !== undefined) data.active = active === 'true' || active === true;
  if (sort !== undefined) data.sort = parseInt(sort) || 0;
  if (req.file) data.previewImage = req.file.path;
  try {
    res.json({ style: await prisma.style.update({ where: { id: req.params.id }, data }) });
  } catch { res.status(404).json({ error: 'Style not found' }); }
});
r.delete('/styles/:id', async (req, res) => {
  const used = await prisma.generation.count({ where: { styleId: req.params.id } });
  if (used) return res.status(409).json({ error: 'This style is used by existing generations; deactivate it instead' });
  await prisma.style.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

// --- Users ---
r.get('/users', async (_req, res) => {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    select: { id: true, email: true, name: true, phone: true, role: true, credits: true, disabled: true, createdAt: true, _count: { select: { generations: true } } },
  });
  res.json({ users });
});
r.patch('/users/:id', async (req, res) => {
  const { credits, addCredits, disabled, role } = req.body || {};
  const target = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!target) return res.status(404).json({ error: 'User not found' });
  if (target.id === req.user.id && (disabled === true || (role && role !== 'ADMIN')))
    return res.status(400).json({ error: 'You cannot disable or demote your own admin account' });
  const data = {};
  if (credits !== undefined) data.credits = Math.max(0, parseInt(credits) || 0);
  if (addCredits !== undefined) data.credits = target.credits + Math.max(0, parseInt(addCredits) || 0);
  if (disabled !== undefined) data.disabled = Boolean(disabled);
  if (role !== undefined && ['USER', 'ADMIN'].includes(role)) data.role = role;
  const user = await prisma.user.update({ where: { id: target.id }, data });
  res.json({ user: { id: user.id, email: user.email, role: user.role, credits: user.credits, disabled: user.disabled } });
});

// --- Generations log ---
r.get('/generations', async (_req, res) => {
  const generations = await prisma.generation.findMany({
    orderBy: { createdAt: 'desc' }, take: 200,
    include: { type: true, style: true, user: { select: { email: true, name: true } } },
  });
  res.json({
    generations: generations.map((g) => ({
      id: g.id, status: g.status, error: g.error, provider: g.provider, demo: g.demo,
      type: g.type.name, style: g.style.name, user: g.user.email,
      createdAt: g.createdAt, completedAt: g.completedAt,
      outputUrl: g.outputPath ? `/api/files/outputs/${path.basename(g.outputPath)}` : null,
    })),
  });
});

// --- Settings (AI provider). The API key is write-only: never returned. ---
r.get('/settings', async (_req, res) => {
  const cfg = await getProviderConfig();
  res.json({
    provider: cfg.provider,
    model: cfg.model,
    apiKeySet: cfg.apiKeySet,
    envOverride: Boolean(process.env.AI_PROVIDER),
  });
});
r.put('/settings', async (req, res) => {
  const { provider, model, apiKey } = req.body || {};
  if (provider !== undefined) {
    if (!['mock', 'gemini'].includes(provider)) return res.status(400).json({ error: 'Unknown provider' });
    await prisma.setting.upsert({ where: { key: 'ai_provider' }, create: { key: 'ai_provider', value: provider }, update: { value: provider } });
  }
  if (model !== undefined) {
    await prisma.setting.upsert({ where: { key: 'ai_model' }, create: { key: 'ai_model', value: String(model) }, update: { value: String(model) } });
  }
  if (apiKey) {
    if (String(apiKey).length < 8) return res.status(400).json({ error: 'Key looks too short' });
    await prisma.setting.upsert({ where: { key: 'ai_api_key' }, create: { key: 'ai_api_key', value: String(apiKey) }, update: { value: String(apiKey) } });
  }
  const cfg = await getProviderConfig();
  res.json({ provider: cfg.provider, model: cfg.model, apiKeySet: cfg.apiKeySet, envOverride: Boolean(process.env.AI_PROVIDER) });
});

export default r;
