/* THIS FILE WAS ENTIRELY AI GENERATED. */

const fs = require('fs');

const { normalize } = require('./normalize');
const { expandInput } = require('./inputs');

const USAGE = 'usage: emit.js [--verbose] [--dry-run] <output> <input...>';

/**
 * @param {string[]} argv
 * @returns {{
 *   output: string;
 *   inputArgs: string[];
 *   verbose: boolean;
 *   dryRun: boolean;
 * } | null}
 */
function parseArgs(argv) {
  const verbose = argv.includes('--verbose') || argv.includes('-v');
  const dryRun = argv.includes('--dry-run');
  const positional = argv.filter((a) => !a.startsWith('-'));
  if (positional.length < 2) return null;
  const [output, ...inputArgs] = positional;
  return { output, inputArgs, verbose, dryRun };
}

/**
 * @param {string} path
 * @returns {unknown[] | null}
 */
function loadDb(path) {
  let raw;
  try {
    raw = fs.readFileSync(path, 'utf8');
  } catch (err) {
    console.error(`error: cannot read ${path}: ${err}`);
    return null;
  }
  let data;
  try {
    data = JSON.parse(raw);
  } catch (err) {
    console.error(`error: invalid JSON in ${path}: ${err}`);
    return null;
  }
  if (!Array.isArray(data)) {
    console.error(`error: ${path} is not a JSON array; skipping`);
    return null;
  }
  return data;
}

/**
 * @param {string[]} argv
 * @returns {number}
 */
function main(argv) {
  const opts = parseArgs(argv);
  if (!opts) {
    console.error(USAGE);
    return 1;
  }
  const { output, inputArgs, verbose, dryRun } = opts;

  const inputs = inputArgs.flatMap(expandInput);
  if (inputs.length === 0) {
    console.error(
      'warning: no compile_commands.json or .xcode-compile-metadata files found'
    );
    return 0;
  }

  // Oldest first so the freshest source's entries overwrite earlier ones.
  inputs.sort((a, b) => fs.statSync(a).mtimeMs - fs.statSync(b).mtimeMs);

  const merged = new Map();
  let droppedEntries = 0;
  for (const p of inputs) {
    const data = loadDb(p);
    if (!data) continue;
    let kept = 0;
    for (const entry of data) {
      const norm = normalize(entry);
      if (norm) {
        merged.set(norm.file, norm);
        kept++;
      } else {
        droppedEntries++;
      }
    }
    if (verbose) {
      const mtime = new Date(fs.statSync(p).mtimeMs).toISOString();
      console.log(`  ${mtime}  ${kept.toString().padStart(4)} entries  ${p}`);
    }
  }

  const result = Array.from(merged.values());

  if (dryRun) {
    console.log(
      `would write ${result.length} entries to ${output} (${inputs.length} sources, ${droppedEntries} dropped)`
    );
    return 0;
  }

  fs.writeFileSync(output, JSON.stringify(result, null, 2));
  const dropMsg = droppedEntries ? `, ${droppedEntries} dropped` : '';
  console.log(
    `merged ${inputs.length} sources -> ${output} (${result.length} entries${dropMsg})`
  );
  return 0;
}

module.exports = { main };
