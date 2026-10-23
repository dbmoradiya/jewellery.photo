import sharp from 'sharp';
import { prisma } from '../db.js';

// --- Provider adapter interface ---
// generate({ prompt, inputImagePath }) -> { buffer, provider, demo }
// Real providers (e.g. gemini) are wired here; 'mock' is the labelled demo provider
// used until the owner configures a paid AI provider key.

async function getSetting(key) {
  const row = await prisma.setting.findUnique({ where: { key } });
  return row?.value ?? null;
}

export async function getProviderConfig() {
  const envProvider = process.env.AI_PROVIDER;
  const provider = envProvider || (await getSetting('ai_provider')) || 'mock';
  const model = process.env.AI_MODEL || (await getSetting('ai_model')) || '';
  const apiKey = process.env.AI_API_KEY || (await getSetting('ai_api_key')) || '';
  return { provider, model, apiKeySet: Boolean(apiKey) };
}

// Internal: never return the key itself.
async function getApiKey() {
  return process.env.AI_API_KEY || (await getSetting('ai_api_key')) || '';
}

const GOLD = '#b08d57';
const IVORY = '#f6f1e8';
const INK = '#131110';

async function mockGenerate({ prompt, inputImagePath }) {
  // Clearly-labelled demo output: the uploaded piece composited on a styled
  // backdrop with a DEMO watermark. This is NOT AI generation.
  const input = sharp(inputImagePath);
  const meta = await input.metadata();
  const W = 1024, H = 1280;
  const pieceSize = 640;
  const piece = await input
    .resize(pieceSize, pieceSize, { fit: 'inside', withoutEnlargement: true })
    .png()
    .toBuffer();
  const pieceMeta = await sharp(piece).metadata();
  const px = Math.round((W - (pieceMeta.width || pieceSize)) / 2);
  const py = Math.round((H - (pieceMeta.height || pieceSize)) / 2) - 60;

  const svg = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="bg" cx="50%" cy="35%" r="90%">
        <stop offset="0%" stop-color="#3a3128"/>
        <stop offset="55%" stop-color="#211c16"/>
        <stop offset="100%" stop-color="${INK}"/>
      </radialGradient>
      <linearGradient id="ring" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${GOLD}" stop-opacity="0.9"/>
        <stop offset="100%" stop-color="${GOLD}" stop-opacity="0.2"/>
      </linearGradient>
    </defs>
    <rect width="${W}" height="${H}" fill="url(#bg)"/>
    <circle cx="${W / 2}" cy="${H / 2 - 60}" r="380" fill="none" stroke="url(#ring)" stroke-width="1.5"/>
    <circle cx="${W / 2}" cy="${H / 2 - 60}" r="360" fill="none" stroke="${GOLD}" stroke-opacity="0.25" stroke-width="0.75"/>
    <text x="${W / 2}" y="90" text-anchor="middle" font-family="Georgia, serif" font-size="30" letter-spacing="8" fill="${GOLD}">JEWELLERY.PHOTO</text>
    <text x="${W / 2}" y="${H - 110}" text-anchor="middle" font-family="Georgia, serif" font-size="44" font-weight="bold" fill="#ffffff" opacity="0.9">DEMO PREVIEW</text>
    <text x="${W / 2}" y="${H - 66}" text-anchor="middle" font-family="Georgia, serif" font-size="21" fill="${IVORY}" opacity="0.75">Mock output - AI provider not connected yet</text>
  </svg>`;

  const buffer = await sharp(Buffer.from(svg))
    .composite([{ input: piece, left: px, top: py }])
    .jpeg({ quality: 90 })
    .toBuffer();
  return { buffer, provider: 'mock', demo: true };
}

async function geminiGenerate({ prompt, inputImagePath, model }) {
  const apiKey = await getApiKey();
  if (!apiKey) throw new Error('AI provider key is not configured');
  const fs = await import('node:fs/promises');
  const imageBytes = await fs.readFile(inputImagePath);
  const useModel = model || 'gemini-2.0-flash-preview-image-generation';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${useModel}:generateContent`;
  const body = {
    contents: [{
      parts: [
        { text: prompt },
        { inlineData: { mimeType: 'image/jpeg', data: imageBytes.toString('base64') } },
      ],
    }],
    generationConfig: { responseModalities: ['TEXT', 'IMAGE'] },
  };
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    throw new Error(`AI provider error (${resp.status})`);
  }
  const data = await resp.json();
  const parts = data?.candidates?.[0]?.content?.parts || [];
  const img = parts.find((p) => p.inlineData?.data);
  if (!img) throw new Error('AI provider returned no image');
  return { buffer: Buffer.from(img.inlineData.data, 'base64'), provider: 'gemini', demo: false };
}

export async function generateImage(args) {
  const cfg = await getProviderConfig();
  if (cfg.provider === 'gemini') {
    if (!cfg.apiKeySet) throw new Error('AI provider key is not configured. Ask the admin to add it in Settings, or switch the provider to Demo.');
    return geminiGenerate({ ...args, model: cfg.model });
  }
  return mockGenerate(args);
}
