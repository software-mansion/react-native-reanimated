import { transformFromAstSync } from '@babel/core';
import type { Binding, NodePath } from '@babel/traverse';
import type {
  FunctionExpression,
  ImportDeclaration,
  ImportSpecifier,
  JSXAttribute,
} from '@babel/types';
import {
  assignmentExpression,
  cloneNode,
  directive,
  directiveLiteral,
  exportDefaultDeclaration,
  expressionStatement,
  identifier,
  importDeclaration,
  isArrayPattern,
  isIdentifier,
  isReturnStatement,
  memberExpression,
  program,
  stringLiteral,
  variableDeclaration,
  variableDeclarator,
} from '@babel/types';
import assert from 'assert';
import { renameSync, writeFileSync } from 'fs';
import { dirname, resolve } from 'path';

import { createImportPathLiteral } from './imports';
import type { WorkletsPluginPass } from './types';
import {
  generatedWorkletsDir,
  inlineModuleSpecifierPrefix,
  workletModuleDirective,
  workletModuleIdBinding,
} from './types';

export function generateWorkletModuleSpecifier(
  moduleBindingsToImport: Set<Binding>,
  relativeBindingsToImport: Set<Binding>,
  factory: FunctionExpression,
  state: WorkletsPluginPass
): string {
  const code = generateWorkletModule(
    moduleBindingsToImport,
    relativeBindingsToImport,
    factory,
    state,
    false
  );
  return (
    inlineModuleSpecifierPrefix + Buffer.from(code, 'utf8').toString('base64')
  );
}

export function generateWorkletFile(
  moduleBindingsToImport: Set<Binding>,
  relativeBindingsToImport: Set<Binding>,
  factory: FunctionExpression,
  workletHash: number,
  state: WorkletsPluginPass
): string {
  const code = generateWorkletModule(
    moduleBindingsToImport,
    relativeBindingsToImport,
    factory,
    state,
    true
  );
  const filesDirPath = resolve(
    dirname(require.resolve('react-native-worklets/package.json')),
    generatedWorkletsDir
  );
  const dedicatedFilePath = resolve(filesDirPath, `${workletHash}.js`);
  const temporaryFilePath = `${dedicatedFilePath}.${process.pid}.tmp`;
  writeFileSync(temporaryFilePath, code);
  renameSync(temporaryFilePath, dedicatedFilePath);
  return `react-native-worklets/${generatedWorkletsDir}/${workletHash}.js`;
}

function generateWorkletModule(
  moduleBindingsToImport: Set<Binding>,
  relativeBindingsToImport: Set<Binding>,
  factory: FunctionExpression,
  state: WorkletsPluginPass,
  rebaseRelativeImports: boolean
): string {
  const imports = [...moduleBindingsToImport, ...relativeBindingsToImport]
    .filter(
      (binding) =>
        (binding.path.isImportSpecifier() ||
          binding.path.isImportDefaultSpecifier()) &&
        binding.path.parentPath.isImportDeclaration()
    )
    .map((binding) => {
      const source = (binding.path.parentPath as NodePath<ImportDeclaration>)
        .node.source.value;
      return importDeclaration(
        [cloneNode(binding.path.node as ImportSpecifier, true)],
        rebaseRelativeImports && source.startsWith('.')
          ? createImportPathLiteral(source, state)
          : stringLiteral(source)
      );
    });

  const statements = [...factory.body.body];
  const returnedWorklet = statements.pop();
  assert(
    isReturnStatement(returnedWorklet) && isIdentifier(returnedWorklet.argument)
  );
  const takenNames = new Set<string>([
    returnedWorklet.argument.name,
    ...[...moduleBindingsToImport, ...relativeBindingsToImport].map(
      (binding) => binding.identifier.name
    ),
    ...factory.params.flatMap((param) =>
      isArrayPattern(param)
        ? param.elements.flatMap((element) =>
            isIdentifier(element) ? [element.name] : []
          )
        : []
    ),
  ]);
  let moduleIdBinding = workletModuleIdBinding;
  while (takenNames.has(moduleIdBinding)) {
    moduleIdBinding = `_${moduleIdBinding}`;
  }
  const readModuleId = variableDeclaration('const', [
    variableDeclarator(
      identifier(moduleIdBinding),
      memberExpression(identifier('module'), identifier('id'))
    ),
  ]);
  const recordModuleId = expressionStatement(
    assignmentExpression(
      '=',
      memberExpression(
        cloneNode(returnedWorklet.argument),
        identifier('__moduleId')
      ),
      identifier(moduleIdBinding)
    )
  );
  if (factory.params.length > 0) {
    factory.body.body.splice(factory.body.body.length - 1, 0, recordModuleId);
  }
  const newProg = program(
    [
      ...imports,
      readModuleId,
      ...(factory.params.length === 0
        ? [
            ...statements,
            recordModuleId,
            exportDefaultDeclaration(returnedWorklet.argument),
          ]
        : [exportDefaultDeclaration(factory)]),
    ],
    [directive(directiveLiteral(workletModuleDirective))]
  );

  const transformedProg = transformFromAstSync(newProg, undefined, {
    filename: state.file.opts.filename,
    presets: [resolvePresetTypescript()],
    plugins: [stripJsxDevAttributesPlugin],
    ast: false,
    babelrc: false,
    configFile: false,
    comments: false,
  })?.code;

  assert(transformedProg, '[Worklets] `transformedProg` is undefined.');

  return transformedProg;
}

function resolvePresetTypescript(): string {
  try {
    return require.resolve('@babel/preset-typescript');
  } catch {
    return require.resolve('@babel/preset-typescript', {
      paths: [dirname(require.resolve('react-native-worklets/package.json'))],
    });
  }
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
