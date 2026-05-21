const fs = require('fs');
const path = require('path');

// Files we accept as compile databases. xcode-build-server writes `.compile`,
// CMake and gradle write `compile_commands.json`.
const INPUT_BASENAMES = new Set(['compile_commands.json', '.compile']);

/**
 * Expands one CLI argument into the concrete files we should read. A plain
 * file path returns itself (no filter — the caller is explicit). A directory
 * is walked recursively for any file matching {@link INPUT_BASENAMES}. A
 * non-existent path returns an empty list (lets the caller pass speculative
 * sources without ever erroring on the missing-platform case).
 *
 * @param {string} arg
 * @returns {string[]}
 */
function expandInput(arg) {
  let stat;
  try {
    stat = fs.statSync(arg);
  } catch {
    return [];
  }
  if (stat.isFile()) return [arg];
  if (!stat.isDirectory()) return [];

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
      else if (entry.isFile() && INPUT_BASENAMES.has(entry.name)) found.push(p);
    }
  }
  walk(arg);
  return found;
}

module.exports = { expandInput };
