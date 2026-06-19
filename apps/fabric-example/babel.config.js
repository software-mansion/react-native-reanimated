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

/** @type {import('react-native-worklets/plugin').PluginOptions} */
const workletsPluginOptions = {
  strictGlobal: true,
  bundleMode: false,
  hermesBytecode: true,
  getHBCBinary,
};

/** @type {import('@babel/core').TransformOptions} */
module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    ['react-native-worklets/plugin', workletsPluginOptions],
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
