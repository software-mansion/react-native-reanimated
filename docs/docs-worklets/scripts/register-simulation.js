const Module = require('node:module');
const path = require('node:path');

require('esbuild-register/dist/node').register({
  jsxFactory: 'createElement',
  jsxFragment: 'Fragment',
});

const SITE_ROOT = path.resolve(__dirname, '..');
const originalResolve = Module._resolveFilename;
Module._resolveFilename = function resolveWithSiteAlias(request, ...rest) {
  const resolved = request.startsWith('@site/')
    ? path.join(SITE_ROOT, request.slice('@site/'.length))
    : request;
  return originalResolve.call(this, resolved, ...rest);
};
