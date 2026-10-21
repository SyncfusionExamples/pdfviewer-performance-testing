// Copies the PDFium engine files (pdfium.js / pdfium.wasm) from node_modules into
// public/ej2-pdfviewer-lib so the viewer loads them locally (resourceUrl).
// Runs automatically after `npm install` (postinstall).
import { cpSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const src = resolve(root, 'node_modules/@syncfusion/ej2-pdfviewer/dist/ej2-pdfviewer-lib');
const dest = resolve(root, 'public/ej2-pdfviewer-lib');

if (!existsSync(src)) {
  console.warn('[copy-pdfium] Source not found, skipping:', src);
} else {
  mkdirSync(dest, { recursive: true });
  cpSync(src, dest, { recursive: true });
  console.log('[copy-pdfium] Copied PDFium resources to public/ej2-pdfviewer-lib');
}
