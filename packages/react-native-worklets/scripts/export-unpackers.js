const { transformFileSync, traverse } = require('@babel/core');
const { program } = require('@babel/types');
const generate = require('@babel/generator').default;
const path = require('path');
const fs = require('fs');
const assert = require('assert').strict;

exportToCpp('valueUnpacker.ts', 'ValueUnpacker');

/**
 * @param {string} sourceFilePath - The path to the TypeScript source file to
 *   transform.
 * @param {string} outputFilename - The path where the generated C++ file should
 *   be written, without extension.
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

  let unpacker;

  traverse(transformed.ast, {
    FunctionDeclaration(path) {
      if (path.node?.id?.name.includes('Unpacker')) {
        unpacker = path.node;
      }
    },
  });

  assert(unpacker, 'Value unpacker function not found in the AST.');

  const prog = program([unpacker]);

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
