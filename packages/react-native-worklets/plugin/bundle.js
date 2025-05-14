const esbuild = require('esbuild');

esbuild.build({
  entryPoints: ['./lib/plugin.js'],
  outfile: 'index.js',
  bundle: true,
  packages: 'external',
  external: ['../package.json'],
  allowOverwrite: true,
  logLevel: 'warning',
  platform: 'node',
  sourcemap: 'linked',
});
