import { transformFromAstSync } from '@babel/core';
import type { Binding, NodePath } from '@babel/traverse';
import type {
  FunctionExpression,
  ImportDeclaration,
  ImportSpecifier,
} from '@babel/types';
import {
  cloneNode,
  exportDefaultDeclaration,
  importDeclaration,
  program,
  stringLiteral,
} from '@babel/types';
import assert from 'assert';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { dirname, relative, resolve } from 'path';

import type { ReanimatedPluginPass } from './types';
import { generatedWorkletsDir } from './types';

export function generateWorkletFile(
  libraryBindingsToImport: Set<Binding>,
  relativeBindingsToImport: Set<Binding>,
  factory: FunctionExpression,
  workletHash: number,
  state: ReanimatedPluginPass
) {
  const libraryImports = Array.from(libraryBindingsToImport)
    .filter(
      (binding) =>
        binding.path.isImportSpecifier() &&
        binding.path.parentPath.isImportDeclaration()
    )
    .map((binding) =>
      importDeclaration(
        [cloneNode(binding.path.node as ImportSpecifier, true)],
        stringLiteral(
          (binding.path.parentPath!.node as ImportDeclaration).source.value
        )
      )
    );

  const filesDirPath = resolve(
    dirname(require.resolve('react-native-worklets/package.json')),
    generatedWorkletsDir
  );

  const relativeImports = Array.from(relativeBindingsToImport)
    .filter(
      (binding) =>
        binding.path.isImportSpecifier() &&
        binding.path.parentPath.isImportDeclaration()
    )
    .map((binding) => {
      const resolved = resolve(
        dirname(state.file.opts.filename!),
        (binding.path.parentPath! as NodePath<ImportDeclaration>).node.source
          .value
      );
      const importPath = relative(filesDirPath, resolved);

      return importDeclaration(
        [cloneNode(binding.path.node as ImportSpecifier, true)],
        stringLiteral(importPath)
      );
    });

  const imports = [...libraryImports, ...relativeImports];

  const newProg = program([...imports, exportDefaultDeclaration(factory)]);

  const transformedProg = transformFromAstSync(newProg, undefined, {
    filename: state.file.opts.filename,
    presets: ['@babel/preset-typescript'],
    plugins: [],
    ast: false,
    babelrc: false,
    configFile: false,
    comments: false,
  })?.code;

  assert(transformedProg, '[Worklets] `transformedProg` is undefined.');

  if (!existsSync(filesDirPath)) {
    mkdirSync(filesDirPath, {});
  }

  const dedicatedFilePath = resolve(filesDirPath, `${workletHash}.js`);

  writeFileSync(dedicatedFilePath, transformedProg);
}
