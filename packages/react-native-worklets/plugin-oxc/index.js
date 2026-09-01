'use strict';

const { existsSync } = require('fs');
const { join } = require('path');

const platform = process.platform;
const arch = process.arch;

function candidates() {
  return [
    join(__dirname, `worklets-oxc-plugin.${platform}-${arch}.node`),
    join(__dirname, 'worklets-oxc-plugin.node'),
  ];
}

let binding = null;
let lastError = null;
for (const p of candidates()) {
  if (existsSync(p)) {
    try {
      binding = require(p);
      break;
    } catch (e) {
      lastError = e;
    }
  }
}

if (!binding) {
  throw new Error(
    `[Worklets] Could not load native binding. Run \`yarn build\` (or \`cargo build --release\`) in ${__dirname}. Last error: ${lastError && lastError.message}`
  );
}

module.exports = binding;
module.exports.default = binding;
