/* THIS FILE WAS ENTIRELY AI GENERATED. */

/**
 * @typedef {object} CompileEntry
 * @property {string} [directory]
 * @property {string} file
 * @property {string} [command]
 * @property {string[]} [arguments]
 * @property {string} [output]
 */

// Apple's clang accepts these; upstream LLVM rejects them as "unknown argument".
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
  // CMake emits `-Xclang -include-pch -Xclang <pch>` to feed a precompiled
  // header. The PCH file only exists after a full build; configureCMakeDebug
  // skips that step, so clang-tidy can't find the PCH on CI. Strip the 4
  // tokens — a sibling `-include <header>` survives and provides the same
  // prefix-header content uncached.
  cmd = cmd.replace(/\s+-Xclang\s+-include-pch\s+-Xclang\s+\S+/g, '');
  return cmd;
}

/**
 * @param {string[]} args
 * @returns {string[]}
 */
function cleanArgs(args) {
  /** @type {string[]} */
  const out = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (
      a === '-Xclang' &&
      args[i + 1] === '-include-pch' &&
      args[i + 2] === '-Xclang'
    ) {
      i += 3;
      continue;
    }
    if (DROP_FLAGS_WITH_VALUE.includes(a)) {
      i += 1;
      continue;
    }
    if (DROP_FLAGS_WITH_VALUE.some((f) => a.startsWith(`${f}=`))) continue;
    out.push(a);
  }
  return out;
}

/**
 * @param {unknown} raw
 * @returns {CompileEntry | null}
 */
function normalize(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const src = /** @type {Record<string, unknown>} */ (raw);
  if (typeof src.file !== 'string') return null;
  /** @type {CompileEntry} */
  const e = { file: src.file };
  if (typeof src.directory === 'string') e.directory = src.directory;
  if (typeof src.output === 'string') e.output = src.output;
  if (typeof src.command === 'string') e.command = cleanCommand(src.command);
  if (Array.isArray(src.arguments)) e.arguments = cleanArgs(src.arguments);
  return e;
}

module.exports = { normalize, DROP_FLAGS_WITH_VALUE };
