import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const prisma = new PrismaClient();
const here = path.dirname(fileURLToPath(import.meta.url));
const uploadDir = path.resolve(process.env.UPLOAD_DIR || './data');
fs.mkdirSync(path.join(uploadDir, 'previews'), { recursive: true });

function seedPreview(slug) {
  const src = path.join(here, 'previews', `${slug}.jpg`);
  if (!fs.existsSync(src)) return null;
  const dest = path.join(uploadDir, 'previews', `seed-${slug}.jpg`);
  fs.copyFileSync(src, dest);
  return dest;
}

const types = [
  ['Necklace', 1], ['Ring', 2], ['Earring', 3], ['Bracelet & Bangle', 4],
  ['Pendant', 5], ['Maan Tika', 6], ['Payal', 7], ['Jewellery Set', 8],
];

const styles = [
  ['Studio Closeup', 'Professional jewellery catalog photograph of the {type} in the uploaded image, extreme closeup on a seamless ivory studio backdrop, soft diffused lighting, crisp focus on every stone and detail, luxury brand aesthetic, high resolution.', 1],
  ['Macro Detail', 'Macro jewellery photograph of the {type} in the uploaded image, shallow depth of field, dramatic side lighting on dark charcoal backdrop, every facet and engraving visible, premium editorial style.', 2],
  ['Studio Shot', 'Clean e-commerce studio photograph of the {type} in the uploaded image, perfectly centered on a pure white background, even soft lighting, true-to-life colors, catalog ready.', 3],
  ['Flat Lay', 'Elegant flat lay photograph of the {type} in the uploaded image arranged on raw silk fabric in warm champagne tones, styled with subtle props, top-down view, soft natural window light.', 4],
  ['Modern Wear', 'Lifestyle photograph of a model wearing the {type} from the uploaded image, modern minimal styling, neutral tones, natural daylight, shallow depth of field keeping the jewellery in sharp focus, contemporary fashion editorial.', 5],
  ['Indian Bridal', 'Opulent Indian bridal photograph featuring the {type} from the uploaded image, traditional bridal styling with rich warm tones, ornate yet tasteful, the jewellery is the hero, festive luxurious mood.', 6],
  ['Shop Display', 'Photograph of the {type} from the uploaded image presented in a premium jewellery boutique display, velvet cushion and glass counter, warm accent lighting, inviting retail atmosphere.', 7],
  ['Golden Hour', 'Artistic photograph of the {type} from the uploaded image bathed in warm golden-hour light, glowing reflections on polished metal and stones, dark elegant backdrop, cinematic luxury feel.', 8],
];

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (adminEmail && adminPassword) {
    if (adminPassword.length < 10) throw new Error('ADMIN_PASSWORD must be at least 10 characters');
    const existing = await prisma.user.findUnique({ where: { email: adminEmail } });
    if (!existing) {
      await prisma.user.create({
        data: { email: adminEmail, passwordHash: await bcrypt.hash(adminPassword, 10), name: 'Admin', role: 'ADMIN', credits: 100 },
      });
      console.log(`seed: created admin ${adminEmail}`);
    }
  } else {
    console.warn('seed: ADMIN_EMAIL/ADMIN_PASSWORD not set - skipping admin bootstrap (no default credentials are ever created).');
  }
  for (const [name, sort] of types) {
    await prisma.jewelleryType.upsert({ where: { slug: slug(name) }, create: { name, slug: slug(name), sort }, update: { sort } });
  }
  for (const [name, promptTemplate, sort] of styles) {
    const s = slug(name);
    const existing = await prisma.style.findUnique({ where: { slug: s } });
    const previewImage = existing?.previewImage || seedPreview(s);
    await prisma.style.upsert({ where: { slug: s }, create: { name, slug: s, promptTemplate, sort, previewImage }, update: { promptTemplate, sort } });
  }
  console.log(`seed: ${types.length} types, ${styles.length} styles ready`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
