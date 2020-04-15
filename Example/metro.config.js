const path = require('path');
const modules = [
  'react',
  'react-native',
  '@babel/runtime',
  'fbjs',
  'hoist-non-react-statics',
  'invariant',
  'prop-types'
];
module.exports = {
  resolver: {
    extraNodeModules: {
      'react-native-reanimated': path.resolve(__dirname, '..'),
      ...modules.reduce((a, name) => {
        a[name] = path.resolve(__dirname, 'node_modules', name);
        return a;
      }, {})
    }
  },
  watchFolders: [path.resolve(__dirname, '..')],
  transformer: {
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: false,
        inlineRequires: false,
      },
    }),
  },
};
