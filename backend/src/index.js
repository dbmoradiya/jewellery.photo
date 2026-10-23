import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { config } from './config.js';
import authRoutes from './routes/auth.js';
import catalogRoutes from './routes/catalog.js';
import generationRoutes from './routes/generations.js';
import adminRoutes from './routes/admin.js';
import paymentRoutes from './routes/payments.js';
import { authRequired } from './auth.js';
import { prisma } from './db.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'jewellery.photo' }));
app.use('/api/auth', authRoutes);
app.use('/api/catalog', catalogRoutes);
app.use('/api/generations', generationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/payments', paymentRoutes);

// Style previews are public marketing assets.
app.use('/api/files/previews', express.static(path.join(config.uploadDir, 'previews'), { fallthrough: false, index: false }));

// Uploads and outputs are private: only the owning member (or an admin) may read them.
app.get('/api/files/:kind/:name', authRequired, async (req, res) => {
  const { kind, name } = req.params;
  if (!['inputs', 'outputs'].includes(kind)) return res.status(404).json({ error: 'Not found' });
  const safe = path.basename(name);
  if (safe !== name) return res.status(404).json({ error: 'Not found' });
  const gen = await prisma.generation.findFirst({
    where: { OR: [{ inputPath: { endsWith: safe } }, { outputPath: { endsWith: safe } }] },
  });
  if (!gen || (gen.userId !== req.user.id && req.user.role !== 'ADMIN')) return res.status(404).json({ error: 'Not found' });
  res.sendFile(path.join(config.uploadDir, kind, safe));
});

app.use((err, _req, res, _next) => {
  if (err?.type === 'entity.too.large' || err?.code === 'LIMIT_FILE_SIZE')
    return res.status(413).json({ error: `File too large (max ${config.maxUploadMb}MB)` });
  res.status(err?.status || 500).json({ error: err?.message || 'Server error' });
});

app.listen(config.port, () => console.log(`jewellery.photo backend listening on :${config.port}`));
