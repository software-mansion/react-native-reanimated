const path = require('path');
const fs = require('fs');
const blacklist = require('metro-config/src/defaults/blacklist');
const glob = require('glob-to-regexp');

const root = path.resolve(__dirname, '..');

const packages = JSON.parse(
  fs.readFileSync(path.join(root, 'package.json'), 'utf8'),
);

const modules = [
  '@babel/runtime',
  ...Object.keys({
    ...packages.dependencies,
    ...packages.peerDependencies,
  }),
];

function getBlacklist() {
  const nodeModuleDirs = [
    glob(`${root}/node_modules/*`),
    glob(`${root}/docs/*`),
    glob(`${root}/Example/*`),
  ];
  return blacklist(nodeModuleDirs);
}

module.exports = {
  projectRoot: __dirname,
  watchFolders: [root],
  resolver: {
    blacklistRE: getBlacklist(),
    extraNodeModules: modules.reduce((cfg, name) => {
      cfg[name] = path.join(__dirname, 'node_modules', name);
      return cfg;
    }, {}),
  },
  transformer: {
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: false,
        inlineRequires: false,
      },
    }),
  },
};
