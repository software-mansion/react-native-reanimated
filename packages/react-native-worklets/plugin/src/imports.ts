import { type NodePath, traverse } from '@babel/core';
import { type Binding } from '@babel/traverse';
import {
  type FunctionExpression,
  type ImportDeclaration,
  type StringLiteral,
  stringLiteral,
} from '@babel/types';
import { dirname, posix, relative, resolve, sep } from 'path';

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
        const requiredModule = nodePath.get(
          'arguments'
        )[0] as NodePath<StringLiteral>;
        if (
          requiredModule.node.value.startsWith('.') &&
          canForwardRelativeImport(
            state.file.opts.filename || '',
            state.opts.importForwarding.relativePaths
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

export function canForwardModuleImport(
  moduleName: string,
  forwardableModuleNames: string[]
): boolean {
  return forwardableModuleNames.some(
    (forwardableModuleName) =>
      moduleName === forwardableModuleName ||
      moduleName.startsWith(forwardableModuleName + '/')
  );
}

export function canForwardRelativeImport(
  modulePath: string | undefined | null,
  relativePaths: string[]
): boolean {
  return (
    !!modulePath &&
    relativePaths.some((relativePath) =>
      matchesFilenameSegment(modulePath, relativePath)
    )
  );
}

function matchesFilenameSegment(
  filename: string,
  allowedPath: string
): boolean {
  const pkgSegments = allowedPath.split(posix.sep);
  let fileSegments = filename.split(sep);
  const lastNodeModules = fileSegments.lastIndexOf('node_modules');
  if (lastNodeModules !== -1) {
    fileSegments = fileSegments.slice(lastNodeModules + 1);
  }
  for (let i = 0; i <= fileSegments.length - pkgSegments.length; i++) {
    if (
      pkgSegments.every(
        (segment, segmentIndex) => fileSegments[i + segmentIndex] === segment
      )
    ) {
      return true;
    }
  }
  return false;
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
  const relativePath = relative(generatedWorkletsDirPath, resolved);
  return stringLiteral(
    sep === '/' ? relativePath : relativePath.split(sep).join('/')
  );
}
