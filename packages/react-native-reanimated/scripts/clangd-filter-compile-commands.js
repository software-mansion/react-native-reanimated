const fs = require('fs');

// xcode-build-server writes `.compile` in a BSP-style schema: it carries
// Swift module entries without a "file" field plus Xcode-specific keys.
// Clangd tolerates that, but clang-tidy's parser doesn't. Filter down to
// the standard JSON Compilation Database shape before publishing.

/**
 * @typedef {object} CompileEntry
 * @property {string} [directory] Working directory of the compile invocation.
 * @property {string} [file] Source file being compiled.
 * @property {string} [command] Whole compile command as a single string.
 * @property {string[]} [arguments] Whole compile command as an argv array.
 * @property {string} [output] Output file produced by the invocation.
 */

// Apple's clang accepts these; upstream LLVM (e.g. brew-installed clang-tidy)
// rejects them with "unknown argument", which fails the whole entry.
const DROP_FLAGS_WITH_VALUE = [
  '-index-store-path',
  '-index-unit-output-path',
  '-ivfsstatcache',
];

/**
 * @param {string[]} args
 * @returns {string[]}
 */
function cleanArgs(args) {
  /** @type {string[]} */
  const out = [];
  let skip = false;
  for (const a of args) {
    if (skip) {
      skip = false;
      continue;
    }
    if (DROP_FLAGS_WITH_VALUE.includes(a)) {
      skip = true;
      continue;
    }
    if (DROP_FLAGS_WITH_VALUE.some((f) => a.startsWith(`${f}=`))) {
      continue;
    }
    out.push(a);
  }
  return out;
}

/**
 * @param {string} s
 * @returns {string}
 */
function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * @param {string} cmd
 * @returns {string}
 */
function cleanCommand(cmd) {
  for (const flag of DROP_FLAGS_WITH_VALUE) {
    const esc = escapeRegex(flag);
    cmd = cmd.replace(new RegExp(`\\s+${esc}\\s+\\S+`, 'g'), '');
    cmd = cmd.replace(new RegExp(`\\s+${esc}=\\S+`, 'g'), '');
  }
  return cmd;
}

const input = process.argv[2] || '.compile';
const output = process.argv[3] || 'compile_commands.json';

/** @type {CompileEntry[]} */
const data = JSON.parse(fs.readFileSync(input, 'utf8'));

/** @type {CompileEntry[]} */
const filtered = [];
for (const entry of data) {
  if (entry.file === undefined) continue;
  /** @type {CompileEntry} */
  const e = {};
  if (entry.directory !== undefined) e.directory = entry.directory;
  e.file = entry.file;
  if (entry.command !== undefined) e.command = cleanCommand(entry.command);
  if (entry.arguments !== undefined) e.arguments = cleanArgs(entry.arguments);
  if (entry.output !== undefined) e.output = entry.output;
  filtered.push(e);
}

fs.writeFileSync(output, JSON.stringify(filtered, null, 2));
