/**
 * @typedef {object} CompileEntry
 * @property {string} [directory] Working directory of the compile invocation.
 * @property {string} file Source file being compiled.
 * @property {string} [command] Whole compile command as a single string.
 * @property {string[]} [arguments] Whole compile command as an argv array.
 * @property {string} [output] Output file produced by the invocation.
 */

const KEEP = new Set(['directory', 'file', 'command', 'arguments', 'output']);

// Apple's clang accepts these; upstream LLVM (clangd/clang-tidy from brew or
// LLVM-built-from-source) rejects them with "unknown argument".
const DROP_FLAGS_WITH_VALUE = [
  '-index-store-path',
  '-index-unit-output-path',
  '-ivfsstatcache',
];

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
 * Returns the entry stripped to the standard JSON-Compilation-Database
 * shape with Apple-only flags removed, or `null` if the raw input lacks
 * a `file` field (e.g. Swift module entries in xcode-build-server output).
 *
 * @param {unknown} raw
 * @returns {CompileEntry | null}
 */
function normalize(raw) {
  if (
    !raw ||
    typeof raw !== 'object' ||
    typeof (/** @type {Record<string, unknown>} */ (raw)).file !== 'string'
  ) {
    return null;
  }
  const src = /** @type {Record<string, unknown>} */ (raw);
  /** @type {CompileEntry} */
  const e = { file: /** @type {string} */ (src.file) };
  if (typeof src.directory === 'string') e.directory = src.directory;
  if (typeof src.output === 'string') e.output = src.output;
  if (typeof src.command === 'string') e.command = cleanCommand(src.command);
  if (Array.isArray(src.arguments))
    e.arguments = cleanArgs(/** @type {string[]} */ (src.arguments));
  for (const k of Object.keys(e)) {
    if (!KEEP.has(k))
      delete /** @type {Record<string, unknown>} */ (e)[k];
  }
  return e;
}

module.exports = { normalize, DROP_FLAGS_WITH_VALUE };
