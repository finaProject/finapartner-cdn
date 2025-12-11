#!/usr/bin/env node
/**
 * Minificador masivo en Node: procesa todos los .js en src/ (no recursivo)
 * y genera dist/<name>.min.js. Usa Terser via API para portabilidad.
 */

const fs = require('fs/promises');
const path = require('path');
const terser = require('terser');

const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const baseDir = path.join(rootDir, 'src');
const TERSER_OPTS = { compress: true, mangle: true };

async function ensureDir(p) {
  await fs.mkdir(p, { recursive: true });
}

async function listJsFilesNonRecursive(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  return entries
    .filter(d => d.isFile())
    .map(d => path.join(dir, d.name))
    .filter(f => f.endsWith('.js') && !f.endsWith('.min.js'));
}

async function minifyOne(src, outDir) {
  const code = await fs.readFile(src, 'utf8');
  const result = await terser.minify(code, TERSER_OPTS);
  if (result.error) throw result.error;
  const baseName = path.basename(src, '.js');
  const out = path.join(outDir, `${baseName}.min.js`);
  await fs.writeFile(out, result.code, 'utf8');
  console.log(`Minified: ${src} -> ${out}`);
}

(async function main() {
  try {
    await ensureDir(distDir);
    let stats;
    try {
      stats = await fs.stat(baseDir);
    } catch {
      // ignored
    }
    if (!stats || !stats.isDirectory()) {
      console.log(`No source directory found at ${baseDir}`);
      return;
    }
    const sources = await listJsFilesNonRecursive(baseDir);
    if (sources.length === 0) {
      console.log(`No source .js files to minify in ${baseDir}`);
      return;
    }
    for (const src of sources) {
      await minifyOne(src, distDir);
    }
    console.log(`Done. ${sources.length} file(s) minified.`);
  } catch (err) {
    console.error(err && err.message ? err.message : err);
    process.exit(1);
  }
})();


