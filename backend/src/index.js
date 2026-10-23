import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { config } from './config.js';
import authRoutes from './routes/auth.js';
import catalogRoutes from './routes/catalog.js';
import generationRoutes from './routes/generations.js';
import adminRoutes from './routes/admin.js';
import { authRequired } from './auth.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'jewellery.photo' }));
app.use('/api/auth', authRoutes);
app.use('/api/catalog', catalogRoutes);
app.use('/api/generations', generationRoutes);
app.use('/api/admin', adminRoutes);

// Stored files require a logged-in account.
app.use('/api/files', authRequired, express.static(config.uploadDir, { fallthrough: false, index: false }));

app.use((err, _req, res, _next) => {
  if (err?.type === 'entity.too.large' || err?.code === 'LIMIT_FILE_SIZE')
    return res.status(413).json({ error: `File too large (max ${config.maxUploadMb}MB)` });
  res.status(err?.status || 500).json({ error: err?.message || 'Server error' });
});

app.listen(config.port, () => console.log(`jewellery.photo backend listening on :${config.port}`));
