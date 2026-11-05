const { transformSync } = require('@babel/core');
const { createHash } = require('crypto');
const fs = require('fs');
const path = require('path');

const INLINE_MODULE_PREFIX = 'metro:inline;base64,';
const INLINE_MODULES_DIR = '.jest-inline-modules';

/** @type {import('jest-resolve').SyncResolver} */
module.exports = (request, options) => {
  if (request.startsWith(INLINE_MODULE_PREFIX)) {
    return materializeInlineModule(request, options);
  }
  return options.defaultResolver(request, options);
};

module.exports.INLINE_MODULE_PREFIX = INLINE_MODULE_PREFIX;
module.exports.materializeInlineModule = materializeInlineModule;
module.exports.rebaseInlineModule = rebaseInlineModule;

function materializeInlineModule(request, { basedir, rootDir }) {
  const rebased = rebaseInlineModule(request, basedir);
  const hash = createHash('sha1').update(rebased).digest('hex').slice(0, 16);
  const dir = path.join(rootDir, INLINE_MODULES_DIR);
  const file = path.join(dir, `${hash}.js`);
  if (!fs.existsSync(file)) {
    fs.mkdirSync(dir, { recursive: true });
    const temporaryFile = `${file}.${process.pid}.tmp`;
    fs.writeFileSync(temporaryFile, rebased);
    fs.renameSync(temporaryFile, file);
  }
  return file;
}

function rebaseInlineModule(request, importerDir) {
  const source = Buffer.from(
    request.slice(INLINE_MODULE_PREFIX.length),
    'base64'
  ).toString('utf8');
  const transformed = transformSync(source, {
    babelrc: false,
    configFile: false,
    sourceType: 'module',
    retainLines: true,
    plugins: [rebaseSpecifiersPlugin(importerDir)],
  });
  return transformed.code;
}

function rebaseSpecifiersPlugin(importerDir) {
  const rebaseSource = (node) => {
    if (node && node.type === 'StringLiteral') {
      node.value = rebaseSpecifier(node.value, importerDir);
      delete node.extra;
    }
  };
  return {
    visitor: {
      ImportDeclaration: (nodePath) => rebaseSource(nodePath.node.source),
      ExportNamedDeclaration: (nodePath) => rebaseSource(nodePath.node.source),
      ExportAllDeclaration: (nodePath) => rebaseSource(nodePath.node.source),
      CallExpression: (nodePath) => {
        const { callee, arguments: args } = nodePath.node;
        const isRequire =
          callee.type === 'Identifier' && callee.name === 'require';
        if (isRequire || callee.type === 'Import') {
          rebaseSource(args[0]);
        }
      },
    },
  };
}

function rebaseSpecifier(specifier, importerDir) {
  if (specifier.startsWith(INLINE_MODULE_PREFIX)) {
    return (
      INLINE_MODULE_PREFIX +
      Buffer.from(rebaseInlineModule(specifier, importerDir), 'utf8').toString(
        'base64'
      )
    );
  }
  if (specifier.startsWith('./') || specifier.startsWith('../')) {
    return path.resolve(importerDir, specifier).split(path.sep).join('/');
  }
  return specifier;
}
