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
      const specifier = nodePath.get('arguments')[0];
      if (
        !specifier?.isStringLiteral() ||
        !specifier.node.value.startsWith('.')
      ) {
        return;
      }
      const callee = nodePath.get('callee');
      if (callee.isImport() || callee.isIdentifier({ name: 'require' })) {
        specifier.replaceWith(
          createImportPathLiteral(specifier.node.value, state)
        );
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
  return forwardableModuleNames.includes(moduleName);
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

export const COMMON_FOLDER_NAMES = new Set([
  'app',
  'build',
  'cjs',
  'common',
  'commonjs',
  'components',
  'core',
  'dist',
  'esm',
  'helpers',
  'lib',
  'module',
  'modules',
  'shared',
  'source',
  'src',
  'utils',
]);

const warnedDangerousPaths = new Set<string>();

export function warnAboutDangerousRelativePaths(
  relativePaths: string[] | undefined,
  silenced: boolean | undefined
) {
  if (silenced || !relativePaths) {
    return;
  }
  for (const relativePath of relativePaths) {
    if (
      warnedDangerousPaths.has(relativePath) ||
      !isDangerousRelativePath(relativePath)
    ) {
      continue;
    }
    warnedDangerousPaths.add(relativePath);
    console.warn(getDangerousRelativePathWarning(relativePath));
  }
}

export function isDangerousRelativePath(relativePath: string) {
  const segments = relativePath.split(posix.sep).filter(Boolean);
  return (
    segments.length > 0 &&
    segments.every((segment) => COMMON_FOLDER_NAMES.has(segment))
  );
}

function getDangerousRelativePathWarning(relativePath: string) {
  return (
    `[Worklets] \`importForwarding.relativePaths\` contains '${relativePath}', which has only common folder names. ` +
    `It also matches folders inside packages in node_modules, for example 'react-native-reanimated/src', ` +
    `and the relative imports inside their worklets get forwarded too, which can crash the app. ` +
    `Use a path that only your code has. ` +
    `Set the \`silenceDangerousPathsWarning\` plugin option to \`true\` to hide this warning. ` +
    `See https://docs.swmansion.com/react-native-worklets/docs/worklets-plugin/plugin-options/#importforwardingrelativepaths`
  );
}
