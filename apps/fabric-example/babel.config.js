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

const BABEL_WORKLETS_PLUGIN = 'react-native-worklets/plugin';

function resolveWorkletsPlugin() {
  const wanted = process.env.WORKLETS_PLUGIN;
  if (wanted === 'oxc') {
    return loadOxcPlugin();
  }
  if (wanted === 'babel') {
    return BABEL_WORKLETS_PLUGIN;
  }
  try {
    return loadOxcPlugin();
  } catch (error) {
    const cause = error instanceof Error ? error.message : String(error);
    console.warn(
      `[Worklets] oxc plugin unavailable, falling back to ${BABEL_WORKLETS_PLUGIN}. ` +
        'Run `yarn build` in packages/react-native-worklets/plugin-oxc to use it. ' +
        `Cause: ${cause.split('\n')[0]}`
    );
    return BABEL_WORKLETS_PLUGIN;
  }
}

function loadOxcPlugin() {
  return require('worklets-oxc-plugin/babel');
}

const workletsPlugin = resolveWorkletsPlugin();

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
