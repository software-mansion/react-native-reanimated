/* THIS FILE WAS ENTIRELY AI GENERATED. */

const fs = require('fs');

const [input, platform, output] = process.argv.slice(2);
if (!input || !platform || !output) {
  console.error('usage: filter-platform.js <input> <ios|android> <output>');
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(input, 'utf8'));

const APPLE =
  /Xcode\.app|XcodeDefault\.xctoolchain|-apple-(?:ios|tvos|macos|watchos|xros)/;
const ANDROID = /\/Android\/(?:sdk\/)?ndk\/|-(?:none-)?linux-android/;

/**
 * @param {{ command?: unknown; arguments?: unknown }} entry
 * @returns {string}
 */
function commandString(entry) {
  if (typeof entry.command === 'string') return entry.command;
  if (Array.isArray(entry.arguments)) return entry.arguments.join(' ');
  return '';
}

const matcher =
  platform === 'ios' ? APPLE : platform === 'android' ? ANDROID : null;
if (!matcher) {
  console.error(`unknown platform '${platform}', expected 'ios' or 'android'`);
  process.exit(1);
}

const filtered = data.filter((e) => matcher.test(commandString(e)));
fs.writeFileSync(output, JSON.stringify(filtered, null, 2));
console.log(`${platform}: ${filtered.length}/${data.length} entries`);
