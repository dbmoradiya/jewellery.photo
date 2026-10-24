// Scoped repair: only fills style sample images that are missing. Touches nothing else
// (no users, credits, prompts, sort, active flags, types, or admin-uploaded previews).
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const prisma = new PrismaClient();
const here = path.dirname(fileURLToPath(import.meta.url));
const uploadDir = path.resolve(process.env.UPLOAD_DIR || './data');
fs.mkdirSync(path.join(uploadDir, 'previews'), { recursive: true });
let fixed = 0;
for (const s of await prisma.style.findMany()) {
  if (s.previewImage && fs.existsSync(s.previewImage)) continue;
  const src = path.join(here, 'previews', `style-${s.slug}.jpg`);
  if (!fs.existsSync(src)) { console.log(`skip ${s.slug}: no bundled sample`); continue; }
  const dest = path.join(uploadDir, 'previews', `seed-${s.slug}.jpg`);
  fs.copyFileSync(src, dest);
  await prisma.style.update({ where: { id: s.id }, data: { previewImage: dest } });
  fixed++; console.log(`restored ${s.slug}`);
}
console.log(`repair-previews: ${fixed} restored`);
await prisma.$disconnect();
