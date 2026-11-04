const { createHash } = require('crypto');
const fs = require('fs');
const path = require('path');

const INLINE_MODULE_PREFIX = 'metro:inline;base64,';
const INLINE_MODULES_DIR = '.jest-inline-modules';
const RELATIVE_SPECIFIER =
  /((?:from|import|require\()\s*["'])(\.{1,2}\/[^"']*)(["'])/g;

/** @type {import('jest-resolve').SyncResolver} */
module.exports = (request, options) => {
  if (request.startsWith(INLINE_MODULE_PREFIX)) {
    return materializeInlineModule(request, options);
  }
  return options.defaultResolver(request, options);
};

module.exports.INLINE_MODULE_PREFIX = INLINE_MODULE_PREFIX;
module.exports.materializeInlineModule = materializeInlineModule;

function materializeInlineModule(request, { basedir, rootDir }) {
  const source = Buffer.from(
    request.slice(INLINE_MODULE_PREFIX.length),
    'base64'
  ).toString('utf8');
  const rebased = source.replace(
    RELATIVE_SPECIFIER,
    (match, before, specifier, after) =>
      before +
      path.resolve(basedir, specifier).split(path.sep).join('/') +
      after
  );
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
