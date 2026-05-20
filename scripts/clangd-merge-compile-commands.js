const fs = require('fs');
const path = require('path');

// Merge multiple compile_commands.json files into a single one keyed by
// "file", preferring the entry from the freshest source. Used to fold the
// iOS-derived DB (xcode-build-server output) together with the per-package
// Android DBs (gradle/cmake output) so clangd has a working compile command
// for every translation unit regardless of which side built most recently.

/**
 * @typedef {object} CompileEntry
 * @property {string} [directory] Working directory of the compile invocation.
 * @property {string} [file] Source file being compiled.
 * @property {string} [command] Whole compile command as a single string.
 * @property {string[]} [arguments] Whole compile command as an argv array.
 * @property {string} [output] Output file produced by the invocation.
 */

const args = process.argv.slice(2);
if (args.length < 2) {
  console.error(
    'usage: clangd-merge-compile-commands.js <output> <input> [input ...]'
  );
  console.error(
    'each <input> may be a compile_commands.json file or a directory to walk'
  );
  process.exit(1);
}

const [output, ...inputArgs] = args;

/**
 * @param {string} dir
 * @returns {string[]}
 */
function findCompileDbs(dir) {
  /** @type {string[]} */
  const found = [];
  /** @param {string} d */
  function walk(d) {
    let entries;
    try {
      entries = fs.readdirSync(d, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const p = path.join(d, entry.name);
      if (entry.isDirectory()) walk(p);
      else if (entry.isFile() && entry.name === 'compile_commands.json')
        found.push(p);
    }
  }
  walk(dir);
  return found;
}

/** @type {string[]} */
const files = [];
for (const arg of inputArgs) {
  let stat;
  try {
    stat = fs.statSync(arg);
  } catch {
    continue;
  }
  if (stat.isFile()) files.push(arg);
  else if (stat.isDirectory()) files.push(...findCompileDbs(arg));
}

if (files.length === 0) {
  console.error('no input compile_commands.json found; nothing to merge');
  process.exit(0);
}

// Sort oldest first so the freshest source's entries overwrite earlier ones.
files.sort((a, b) => fs.statSync(a).mtimeMs - fs.statSync(b).mtimeMs);

/** @type {Map<string, CompileEntry>} */
const merged = new Map();
for (const p of files) {
  /** @type {CompileEntry[]} */
  let data;
  try {
    data = JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch (err) {
    console.error(`skipping ${p}: ${err}`);
    continue;
  }
  if (!Array.isArray(data)) continue;
  for (const entry of data) {
    if (entry && typeof entry.file === 'string') merged.set(entry.file, entry);
  }
}

fs.writeFileSync(
  output,
  JSON.stringify(Array.from(merged.values()), null, 2)
);

console.log(
  `merged ${files.length} sources -> ${output} (${merged.size} entries)`
);
for (const p of files) {
  const mtime = new Date(fs.statSync(p).mtimeMs).toISOString();
  console.log(`  ${mtime}  ${p}`);
}
