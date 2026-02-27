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
const workletsBabelPlugin = require('../plugin');

/** @type {import('../plugin/').PluginOptions} */
const workletsBabelPluginOptions = {
  limitInitDataHoisting: true,
};

exportToCpp('valueUnpacker.native.ts', 'ValueUnpacker');
exportToCpp('synchronizableUnpacker.native.ts', 'SynchronizableUnpacker');
exportToCpp(
  'customSerializableUnpacker.native.ts',
  'CustomSerializableUnpacker'
);
exportToCpp('shareableHostUnpacker.native.ts', 'ShareableHostUnpacker');
exportToCpp('shareableGuestUnpacker.native.ts', 'ShareableGuestUnpacker');

/**
 * @param {string} sourceFilePath - The path to the TypeScript source file to
 *   transform.
 * @param {string} outputFilename - The filename (without extension) to use for
 *   the generated C++ file.
 */
function exportToCpp(sourceFilePath, outputFilename) {
  const transformed = transformFileSync(
    path.resolve(__dirname, `../src/memory/${sourceFilePath}`),
    {
      presets: [
        ['@babel/preset-env', { modules: false }],
        '@babel/preset-typescript',
      ],
      plugins: [[workletsBabelPlugin, workletsBabelPluginOptions]],
      sourceType: 'unambiguous',
      code: false,
      ast: true,
      comments: false,
      configFile: false,
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

  console.log(`✅ Exported ${sourceFilePath} to ${outputFilename}.cpp`);
}
