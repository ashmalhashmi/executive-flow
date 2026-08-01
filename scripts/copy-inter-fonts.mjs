import { copyFileSync, existsSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'public', 'fonts');
const srcDir = join(root, 'node_modules', '@fontsource', 'inter', 'files');
const weights = [400, 500, 600, 700];

mkdirSync(outDir, { recursive: true });

if (!existsSync(srcDir)) {
  const hasFonts = weights.every((w) =>
    existsSync(join(outDir, `inter-latin-${w}-normal.woff2`)),
  );
  if (hasFonts) {
    console.log('Using committed Inter fonts in public/fonts/');
    process.exit(0);
  }
  throw new Error('Missing @fontsource/inter and no committed fonts in public/fonts/');
}

for (const weight of weights) {
  const file = `inter-latin-${weight}-normal.woff2`;
  copyFileSync(join(srcDir, file), join(outDir, file));
}

console.log(`Copied Inter (${weights.join(', ')}) → public/fonts/`);
