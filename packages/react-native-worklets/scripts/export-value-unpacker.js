const { transformFileSync, traverse } = require('@babel/core');
const { program } = require('@babel/types');
const generate = require('@babel/generator').default;
const path = require('path');
const fs = require('fs');
const assert = require('assert').strict;

const transformed = transformFileSync(
  path.resolve(__dirname, '../src/valueUnpacker.ts'),
  {
    presets: [
      ['@babel/preset-env', { modules: false }],
      '@babel/preset-typescript',
    ],
    sourceType: 'unambiguous',
    code: false,
    ast: true,
    comments: false,
  }
);

assert(
  transformed && transformed.ast,
  'Transformation failed or AST not generated.'
);

let valueUnpackerFn;

traverse(transformed.ast, {
  FunctionDeclaration(path) {
    if (path.node?.id?.name === '__valueUnpacker') {
      valueUnpackerFn = path.node;
    }
  },
});

assert(valueUnpackerFn, 'Value unpacker function not found in the AST.');

const prog = program([valueUnpackerFn]);

const transformFrom = generate(prog, {
  comments: false,
  compact: false,
});

fs.writeFileSync(
  path.resolve(__dirname, '../Common/cpp/worklets/Resources/ValueUnpacker.cpp'),
  `// This file was generated with
// \`packages/react-native-worklets/scripts/export-value-unpacker.js\`.
// Please do not modify it directly.

#include <worklets/Resources/ValueUnpacker.h>

namespace worklets {

const char ValueUnpackerCode[] =
    R"VALUE_UNPACKER(` +
    transformFrom.code +
    `)VALUE_UNPACKER";
} // namespace worklets
`,
  'utf8'
);
