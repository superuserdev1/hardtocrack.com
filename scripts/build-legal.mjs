import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const output = join(root, 'dist');
const fields = ['LEGAL_NAME', 'LEGAL_NIF', 'LEGAL_POSTAL_ADDRESS'];
await rm(output, { recursive: true, force: true });
const missing = fields.filter((field) => !process.env[field]?.trim());
if (missing.length) {
  console.error(`Build cancelled: missing ${missing.join(', ')} in deployment environment.`);
  process.exit(1);
}

const htmlEscape = (value) => value.replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[char]);

await mkdir(output, { recursive: true });
const excluded = new Set(['.git', '.github', 'dist', 'scripts', 'vercel.json', 'README_deploy.md']);
for (const entry of await readdir(root, { withFileTypes: true })) {
  if (excluded.has(entry.name) || entry.name.startsWith('.')) continue;
  await cp(join(root, entry.name), join(output, entry.name), { recursive: true });
}

for (const page of ['index.html', 'guia/index.html', 'privacidad/index.html', 'guia/privacidad/index.html']) {
  const target = join(output, page);
  let content = await readFile(target, 'utf8');
  for (const field of fields) {
    const marker = `{{${field}}}`;
    if (!content.includes(marker) && field === 'LEGAL_NAME') {
      throw new Error(`Missing legal field marker in ${page}: ${field}`);
    }
    content = content.replaceAll(marker, htmlEscape(process.env[field].trim()));
  }
  if (/{{LEGAL_[A-Z_]+}}/.test(content)) throw new Error(`Unresolved legal field in ${page}`);
  await writeFile(target, content);
}

console.log('Static site built with legal information.');
