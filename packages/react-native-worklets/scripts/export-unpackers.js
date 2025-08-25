const { transformFileSync, traverse } = require('@babel/core');
const {
  program,
  expressionStatement,
  callExpression,
  functionExpression,
} = require('@babel/types');
const generate = require('@babel/generator').default;
const path = require('path');
const fs = require('fs');
const assert = require('assert').strict;

exportToCpp('valueUnpacker.ts', 'ValueUnpacker');
exportToCpp('synchronizableUnpacker.ts', 'SynchronizableUnpacker');

/**
 * @param {string} sourceFilePath - The path to the TypeScript source file to
 *   transform.
 * @param {string} outputFilename - The filename (without extension) to use for
 *   the generated C++ file.
 */
function exportToCpp(sourceFilePath, outputFilename) {
  const transformed = transformFileSync(
    path.resolve(__dirname, `../src/${sourceFilePath}`),
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

  let unpackerBody;

  traverse(transformed.ast, {
    FunctionDeclaration(path) {
      if (path.node?.id?.name === '__installUnpacker') {
        unpackerBody = path.node.body;
      }
    },
  });

  assert(unpackerBody, 'Value unpacker function not found in the AST.');

  const iife = expressionStatement(
    callExpression(functionExpression(null, [], unpackerBody), [])
  );

  const prog = program([iife]);

  const transformFrom = generate(prog, {
    comments: false,
    compact: false,
  });

  const delimiter = 'DELIMITER__';

  const cstrName = `${outputFilename}Code`;
  fs.writeFileSync(
    path.resolve(
      __dirname,
      `../Common/cpp/worklets/Resources/${outputFilename}.cpp`
    ),
    `// This file was generated with
// \`packages/react-native-worklets/scripts/export-unpackers.js\`.
// Please do not modify it directly.

#include <worklets/Resources/Unpackers.h>

namespace worklets {

const char ${cstrName}[] =
    R"${delimiter}(` +
      transformFrom.code +
      `)${delimiter}";
} // namespace worklets
`,
    'utf8'
  );
}
