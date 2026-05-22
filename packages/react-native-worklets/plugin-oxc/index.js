'use strict';

const { existsSync } = require('fs');
const { join } = require('path');

const platform = process.platform;
const arch = process.arch;

function candidates() {
  const localBindings = [
    join(__dirname, `worklets-plugin-oxc.${platform}-${arch}.node`),
    join(__dirname, 'worklets-plugin-oxc.node'),
  ];

  if (platform === 'darwin') {
    localBindings.push(join(__dirname, 'target', 'release', 'libworklets_plugin_oxc.dylib'));
    localBindings.push(join(__dirname, 'target', 'debug', 'libworklets_plugin_oxc.dylib'));
  } else if (platform === 'linux') {
    localBindings.push(join(__dirname, 'target', 'release', 'libworklets_plugin_oxc.so'));
    localBindings.push(join(__dirname, 'target', 'debug', 'libworklets_plugin_oxc.so'));
  } else if (platform === 'win32') {
    localBindings.push(join(__dirname, 'target', 'release', 'worklets_plugin_oxc.dll'));
    localBindings.push(join(__dirname, 'target', 'debug', 'worklets_plugin_oxc.dll'));
  }

  return localBindings;
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
    `[worklets-plugin-oxc] Could not load native binding. Run \`cargo build --release\` in ${__dirname}. Last error: ${lastError && lastError.message}`
  );
}

module.exports = binding;
module.exports.default = binding;
