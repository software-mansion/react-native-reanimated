import { transformFromAstSync } from '@babel/core';
import type { Binding, NodePath } from '@babel/traverse';
import type {
  FunctionExpression,
  ImportDeclaration,
  ImportSpecifier,
  JSXAttribute,
} from '@babel/types';
import {
  cloneNode,
  exportDefaultDeclaration,
  importDeclaration,
  program,
  stringLiteral,
} from '@babel/types';
import assert from 'assert';
import { writeFileSync } from 'fs';
import { dirname, resolve } from 'path';

import { createImportPathLiteral } from './imports';
import type { WorkletsPluginPass } from './types';
import { generatedWorkletsDir } from './types';

export function generateWorkletFile(
  moduleBindingsToImport: Set<Binding>,
  relativeBindingsToImport: Set<Binding>,
  factory: FunctionExpression,
  workletHash: number,
  state: WorkletsPluginPass
) {
  const libraryImports = Array.from(moduleBindingsToImport)
    .filter(
      (binding) =>
        (binding.path.isImportSpecifier() ||
          binding.path.isImportDefaultSpecifier()) &&
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
    .map((binding) =>
      importDeclaration(
        [cloneNode(binding.path.node as ImportSpecifier, true)],
        createImportPathLiteral(
          (binding.path.parentPath! as NodePath<ImportDeclaration>).node.source
            .value,
          state
        )
      )
    );

  const imports = [...libraryImports, ...relativeImports];

  const newProg = program([...imports, exportDefaultDeclaration(factory)]);

  const transformedProg = transformFromAstSync(newProg, undefined, {
    filename: state.file.opts.filename,
    // Resolve `@babel/preset-typescript` relative to this package's own
    // install location (it is a direct dependency of `react-native-worklets`)
    // instead of passing the bare specifier. Without an explicit `cwd`
    // above, Babel resolves presets/plugins passed directly as options
    // relative to `process.cwd()` (see `buildRootChain` in
    // `@babel/core/lib/config/config-chain.js`), not relative to `filename`.
    // Nothing guarantees `@babel/preset-typescript` is reachable from
    // whatever directory happens to be the current process's cwd when this
    // transform runs (e.g. a monorepo subpackage directory, or a bundler
    // worker process with a different cwd) — that depends entirely on the
    // package manager's incidental node_modules hoisting behavior, which is
    // not guaranteed to be stable across installs (e.g. with pnpm).
    // Resolving it from our own package directory instead removes that
    // dependency on hoisting.
    presets: [
      require.resolve('@babel/preset-typescript', {
        paths: [dirname(require.resolve('react-native-worklets/package.json'))],
      }),
    ],
    plugins: [state.autoworkletizationPlugin, stripJsxDevAttributesPlugin],
    ast: false,
    babelrc: false,
    configFile: false,
    comments: false,
  })?.code;

  assert(transformedProg, '[Worklets] `transformedProg` is undefined.');

  const dedicatedFilePath = resolve(filesDirPath, `${workletHash}.js`);

  writeFileSync(dedicatedFilePath, transformedProg);
}

const stripJsxDevAttributesPlugin = {
  name: 'worklets-strip-jsx-dev-attributes',
  visitor: {
    JSXAttribute(path: NodePath<JSXAttribute>) {
      const name = path.node.name;

      if (name.type !== 'JSXIdentifier') {
        return;
      }

      if (name.name !== '__self' && name.name !== '__source') {
        return;
      }

      path.remove();
    },
  },
};
