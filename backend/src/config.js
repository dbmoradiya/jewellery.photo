import 'dotenv/config';
import path from 'node:path';
import fs from 'node:fs';
export const config = {
  port: parseInt(process.env.PORT || '8080', 10),
  jwtSecret: process.env.JWT_SECRET || 'dev-only-insecure-secret',
  uploadDir: path.resolve(process.env.UPLOAD_DIR || './data'),
  freeCredits: parseInt(process.env.FREE_CREDITS || '2', 10),
  maxUploadMb: 15,
};
fs.mkdirSync(path.join(config.uploadDir, 'inputs'), { recursive: true });
fs.mkdirSync(path.join(config.uploadDir, 'outputs'), { recursive: true });
fs.mkdirSync(path.join(config.uploadDir, 'previews'), { recursive: true });
