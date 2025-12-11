#!/usr/bin/env node
/**
 * Minificador de archivos JavaScript (Node).
 * - Base por defecto: src/
 * - Acepta nombres con o sin extensión .js
 * - Permite cambiar el directorio base con --dir <target>
 * - Falla si el directorio base no existe o si se piden nombres inexistentes
 * - Salida: dist/<name>.min.js
 */

const fs = require('fs/promises');
const path = require('path');
const terser = require('terser');

const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
let baseDir = path.join(rootDir, 'src');
const TERSER_OPTS = { compress: true, mangle: true };

function usage() {
  console.error(`Usage:
  minify-files.js                         # minify all in src/
  minify-files.js --dir <dir>             # minify all in <dir>
  minify-files.js [--dir <dir>] <name>... # minify <dir>/<name>.js (ext .js opcional)
Notes:
  - Base dir por defecto: src/
  - Omite *.min.js
  - Argumentos aceptan nombre con o sin .js
Examples:
  minify-files.js meta gtm
  minify-files.js --dir scripts meta`);
}

function parseArgs(argv) {
  const out = { dir: null, names: [], help: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '-h' || a === '--help') {
      out.help = true;
    } else if (a === '-d' || a === '--dir') {
      if (i + 1 >= argv.length) throw new Error('--dir requires a value');
      out.dir = argv[++i];
    } else if (a === '--') {
      out.names.push(...argv.slice(i + 1));
      break;
    } else if (a.startsWith('-')) {
      throw new Error(`Unknown flag: ${a}`);
    } else {
      out.names.push(a);
    }
  }
  return out;
}

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
    const argv = process.argv.slice(2);
    const { dir, names, help } = parseArgs(argv);
    if (help) {
      usage();
      process.exit(0);
    }

    if (dir) {
      baseDir = path.isAbsolute(dir) ? dir : path.join(rootDir, dir);
    }

    // Fail if baseDir does not exist (requisito)
    let stats;
    try {
      stats = await fs.stat(baseDir);
    } catch {
      // ignored
    }
    if (!stats || !stats.isDirectory()) {
      console.error(`Error: base directory not found: ${baseDir}`);
      process.exit(1);
    }

    await ensureDir(distDir);

    let sources = [];
    let hadMissing = false;

    if (names.length === 0) {
      sources = await listJsFilesNonRecursive(baseDir);
    } else {
      for (const n of names) {
        let base = path.basename(n);
        if (base.endsWith('.min.js')) {
          console.log(`Skipping already minified input: ${base}`);
          continue;
        }
        base = base.endsWith('.js') ? base.slice(0, -3) : base;
        if (!base) {
          console.error(`Warning: invalid name '${n}', skipping.`);
          hadMissing = true;
          continue;
        }
        const src = path.join(baseDir, `${base}.js`);
        try {
          await fs.stat(src);
          sources.push(src);
        } catch {
          console.error(`Error: not found: ${src}`);
          hadMissing = true;
        }
      }
    }

    if (sources.length === 0) {
      console.error(`No .js files found to minify in ${baseDir}.`);
      process.exit(1);
    }

    for (const src of sources) {
      await minifyOne(src, distDir);
    }

    if (hadMissing) process.exit(1);
  } catch (err) {
    console.error(err && err.message ? err.message : err);
    process.exit(1);
  }
})();


