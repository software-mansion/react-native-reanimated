const Module = require('node:module');
const path = require('node:path');

require('esbuild-register/dist/node').register({
  jsxFactory: 'createElement',
  jsxFragment: 'Fragment',
});

const SITE_ROOT = path.resolve(__dirname, '..');
const pinSnippetNames = require('../src/simulation/snippetNamesLoader.js');
const SNIPPET_PATH = /(?:[\\/]snippets[\\/]|[\\/]_[^\\/]+[\\/])[^\\/]+\.jsx?$/;
const originalCompile = Module.prototype._compile;
Module.prototype._compile = function compileWithSnippetNames(content, filename) {
  const source = SNIPPET_PATH.test(filename) ? pinSnippetNames(content) : content;
  return originalCompile.call(this, source, filename);
};
const originalResolve = Module._resolveFilename;
Module._resolveFilename = function resolveWithSiteAlias(request, ...rest) {
  const resolved = request.startsWith('@site/')
    ? path.join(SITE_ROOT, request.slice('@site/'.length))
    : request;
  return originalResolve.call(this, resolved, ...rest);
};
