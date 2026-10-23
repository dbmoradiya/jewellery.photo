import { Router } from 'express';
import { prisma } from '../db.js';

const r = Router();

r.get('/types', async (_req, res) => {
  const types = await prisma.jewelleryType.findMany({ where: { active: true }, orderBy: [{ sort: 'asc' }, { name: 'asc' }] });
  res.json({ types });
});

r.get('/styles', async (_req, res) => {
  const styles = await prisma.style.findMany({ where: { active: true }, orderBy: [{ sort: 'asc' }, { name: 'asc' }] });
  res.json({
    styles: styles.map((s) => ({
      ...s,
      previewUrl: s.previewImage ? `/api/files/previews/${s.previewImage.split('/').pop()}` : null,
    })),
  });
});

export default r;
