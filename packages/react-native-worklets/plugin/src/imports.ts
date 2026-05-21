import { type NodePath, traverse } from '@babel/core';
import { type Binding } from '@babel/traverse';
import {
  type FunctionExpression,
  type ImportDeclaration,
  type StringLiteral,
  stringLiteral,
} from '@babel/types';
import { dirname, relative, resolve } from 'path';

import { generatedWorkletsDir, type WorkletsPluginPass } from './types';

export function updateRelativeRequires(
  node: FunctionExpression,
  state: WorkletsPluginPass
): void {
  traverse(node, {
    noScope: true,
    CallExpression(nodePath) {
      if (
        nodePath.get('callee').isIdentifier({ name: 'require' }) &&
        nodePath.get('arguments')[0]?.isStringLiteral()
      ) {
        const requiredModule = nodePath.get('arguments')[0];
        if (
          requiredModule.isStringLiteral() &&
          requiredModule.node.value.startsWith('.') &&
          isAllowedForRelativeImports(
            state.file.opts.filename || '',
            state.opts.workletizableModules
          )
        ) {
          requiredModule.replaceWith(
            createImportPathLiteral(requiredModule.node.value, state)
          );
        }
      }
    },
  });
}
export function isImport(binding: Binding): boolean {
  return (
    binding.kind === 'module' &&
    binding.constant &&
    (binding.path.isImportSpecifier() ||
      binding.path.isImportDefaultSpecifier()) &&
    binding.path.parentPath.isImportDeclaration()
  );
}

export function isImportRelative(imported: Binding): boolean {
  return (
    imported.path.parentPath as NodePath<ImportDeclaration>
  ).node.source.value.startsWith('.');
}

export function isAllowedForRelativeImports(
  filename: string | undefined | null,
  workletizableModules?: string[]
): boolean {
  return (
    !!filename &&
    (alwaysAllowed.some((module) => filename.includes(module)) ||
      !!workletizableModules?.some((module) => filename.includes(module)))
  );
}

export function isWorkletizableModule(
  source: string,
  workletizableModules?: string[]
): boolean {
  return (
    alwaysAllowed.some((module) => source.startsWith(module)) ||
    !!workletizableModules?.some((module) => source.startsWith(module))
  );
}

export function createImportPathLiteral(
  originalPath: string,
  state: WorkletsPluginPass
): StringLiteral {
  const generatedWorkletsDirPath = resolve(
    dirname(require.resolve('react-native-worklets/package.json')),
    generatedWorkletsDir
  );

  const resolved = resolve(dirname(state.file.opts.filename!), originalPath);
  return stringLiteral(relative(generatedWorkletsDirPath, resolved));
}

const alwaysAllowed = [
  'react-native-worklets',
  'react-native/Libraries/Core/setUpXHR', // for networking
];
