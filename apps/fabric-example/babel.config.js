/** @type {import('react-native-worklets/plugin').PluginOptions} */
const workletsPluginOptions = {
  bundleMode: true,
  strictGlobal: true,
  hermesBytecode: false,
  getHBCBinary,
  importForwarding: {
    moduleNames: ['axios'],
  },
};

const workletsPlugin =
  process.env.WORKLETS_PLUGIN === 'babel'
    ? 'react-native-worklets/plugin'
    : require.resolve('worklets-plugin-oxc/babel');

/** @type {import('@babel/core').TransformOptions} */
module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    [workletsPlugin, workletsPluginOptions],
    [
      'module-resolver',
      {
        alias: {
          '@': '../common-app/src',
        },
        extensions: ['.js', '.jsx', '.ts', '.tsx'],
      },
    ],
  ],
};

const path = require('path');

function getHBCBinary() {
  const hermescDir = path.join(
    path.dirname(require.resolve('hermes-compiler/package.json')),
    'hermesc'
  );
  const binDir =
    process.platform === 'darwin'
      ? 'osx-bin'
      : process.platform === 'win32'
        ? 'win64-bin'
        : 'linux64-bin';
  const binName = process.platform === 'win32' ? 'hermesc.exe' : 'hermesc';
  return path.join(hermescDir, binDir, binName);
}
