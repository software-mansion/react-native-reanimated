/* THIS FILE WAS ENTIRELY AI GENERATED. */

const fs = require('fs');
const path = require('path');

const INPUT_BASENAMES = new Set([
  'compile_commands.json',
  '.xcode-compile-metadata',
]);
const SKIP_DIRS = new Set(['node_modules', 'Pods', 'build']);

/**
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
      if (entry.isDirectory()) {
        if (!SKIP_DIRS.has(entry.name)) walk(path.join(d, entry.name));
      } else if (entry.isFile() && INPUT_BASENAMES.has(entry.name)) {
        found.push(path.join(d, entry.name));
      }
    }
  }
  walk(arg);
  return found;
}

module.exports = { expandInput };
