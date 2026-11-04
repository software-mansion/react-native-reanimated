const Module = require('node:module');
const path = require('node:path');
const { readFileSync } = require('node:fs');
const { transformSync } = require('esbuild');

require('esbuild-register/dist/node').register({
  jsxFactory: 'createElement',
  jsxFragment: 'Fragment',
});

const SITE_ROOT = path.resolve(__dirname, '..');
const pinSnippetNames = require('../src/simulation/snippetNamesLoader.js');
const SNIPPET_PATH = /(?:[\\/]snippets[\\/]|[\\/]_[^\\/]+[\\/])[^\\/]+\.jsx?$/;
const originalLoadJs = Module._extensions['.js'];
Module._extensions['.js'] = function loadSnippet(module, filename) {
  if (!SNIPPET_PATH.test(filename)) {
    return originalLoadJs(module, filename);
  }
  const { code } = transformSync(
    pinSnippetNames(readFileSync(filename, 'utf8')),
    {
      format: 'cjs',
      loader: 'jsx',
      jsxFactory: 'createElement',
      jsxFragment: 'Fragment',
      sourcefile: filename,
    }
  );
  return module._compile(code, filename);
};
const originalResolve = Module._resolveFilename;
Module._resolveFilename = function resolveWithSiteAlias(request, ...rest) {
  const resolved = request.startsWith('@site/')
    ? path.join(SITE_ROOT, request.slice('@site/'.length))
    : request;
  return originalResolve.call(this, resolved, ...rest);
};
