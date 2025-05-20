const { transformFileSync, traverse } = require('@babel/core');
const generate = require('@babel/generator').default;
const path = require('path');
const fs = require('fs');

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

// @ts-expect-error
traverse(transformed.ast, {
  Program(path) {
    path.get('directives').forEach((directive) => {
      // We must strip top-level directives since
      // they cannot be present in top-level code.
      directive.remove();
    });
  },
});

// @ts-expect-error
const transformFrom = generate(transformed.ast, {
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
