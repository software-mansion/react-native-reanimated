import type { NodePath } from '@babel/core';
import type { Binding } from '@babel/traverse';
import type { ImportDeclaration } from '@babel/types';
import { posix, sep } from 'path';

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
