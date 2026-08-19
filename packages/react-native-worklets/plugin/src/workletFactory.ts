import type { NodePath } from '@babel/core';
import generate from '@babel/generator';
import type {
  ExpressionStatement,
  ObjectExpression,
  ReturnStatement,
  VariableDeclaration,
} from '@babel/types';
import {
  assignmentExpression,
  blockStatement,
  cloneNode,
  expressionStatement,
  functionExpression,
  identifier,
  isBlockStatement,
  isFunctionDeclaration,
  isFunctionExpression,
  isIdentifier,
  isObjectMethod,
  memberExpression,
  numericLiteral,
  objectExpression,
  objectPattern,
  objectProperty,
  returnStatement,
  stringLiteral,
  toIdentifier,
  variableDeclaration,
  variableDeclarator,
} from '@babel/types';
import { strict as assert } from 'assert';
import { basename } from 'path';

import { getClosure } from './closure';
import { generateWorkletFile } from './generate';
import { updateRelativeRequires } from './imports';
import { workletTransformSync } from './transform';
import type { WorkletizableFunction, WorkletsPluginPass } from './types';
import { isRelease } from './utils';
import { buildWorkletString } from './workletStringCode';

// eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
const REAL_VERSION = require('../../package.json').version;

const MOCK_VERSION = 'x.y.z';

export function makeWorkletFactory(
  fun: NodePath<WorkletizableFunction>,
  state: WorkletsPluginPass
): {
  factoryCallParamPack: ObjectExpression;
  workletHash: number;
} {
  // Returns a new FunctionExpression which is a workletized version of provided
  // FunctionDeclaration, FunctionExpression, ArrowFunctionExpression or ObjectMethod.

  stripWorkletDirectives(fun);

  // We use copy because some of the plugins don't update bindings and
  // some even break them
  assert(state.file.opts.filename, '`state.file.opts.filename` is undefined.');

  const codeObject = generate(fun.node);

  // We need to add a newline at the end, because there could potentially be a
  // comment after the function that gets included here, and then the closing
  // bracket would become part of the comment thus resulting in an error, since
  // there is a missing closing bracket.
  codeObject.code =
    '(' + (fun.isObjectMethod() ? 'function ' : '') + codeObject.code + '\n)';

  const transformed = workletTransformSync(codeObject.code, {
    extraPlugins: [...extraPlugins, ...(state.opts.extraPlugins ?? [])],
    extraPresets: state.opts.extraPresets,
    filename: state.file.opts.filename,
    ast: true,
    babelrc: false,
    configFile: false,
  });

  assert(transformed, '`transformed` is undefined.');
  assert(transformed.ast, '`transformed.ast` is undefined.');

  const { closureVariables, moduleBindingsToImport, relativeBindingsToImport } =
    getClosure(fun, state);

  const clone = cloneNode(fun.node);
  const funExpression = isBlockStatement(clone.body)
    ? functionExpression(
        null,
        clone.params,
        clone.body,
        clone.generator,
        clone.async
      )
    : clone;

  const { workletName, reactName } = makeWorkletName(fun, state);

  const funString = buildWorkletString(
    transformed.ast,
    state,
    closureVariables,
    workletName
  );
  assert(funString, '`funString` is undefined.');
  const workletHash = hash(funString);

  assert(
    !isFunctionDeclaration(funExpression),
    '`funExpression` is a `FunctionDeclaration`.'
  );
  assert(
    !isObjectMethod(funExpression),
    '`funExpression` is an `ObjectMethod`.'
  );

  const statements: Array<
    VariableDeclaration | ExpressionStatement | ReturnStatement
  > = [
    variableDeclaration('const', [
      variableDeclarator(identifier(reactName), funExpression),
    ]),
    expressionStatement(
      assignmentExpression(
        '=',
        memberExpression(identifier(reactName), identifier('__closure'), false),
        objectExpression(
          closureVariables.map((variable) =>
            objectProperty(
              cloneNode(variable, true),
              cloneNode(variable, true),
              false,
              true
            )
          )
        )
      )
    ),
    expressionStatement(
      assignmentExpression(
        '=',
        memberExpression(
          identifier(reactName),
          identifier('__workletHash'),
          false
        ),
        numericLiteral(workletHash)
      )
    ),
  ];

  const shouldInjectVersion = !isRelease(state);
  if (shouldInjectVersion) {
    statements.push(
      expressionStatement(
        assignmentExpression(
          '=',
          memberExpression(
            identifier(reactName),
            identifier('__pluginVersion')
          ),
          stringLiteral(shouldMockVersion() ? MOCK_VERSION : REAL_VERSION)
        )
      )
    );
  }

  statements.push(returnStatement(identifier(reactName)));

  const factoryParams = closureVariables.map((variableId) =>
    cloneNode(variableId, true)
  );

  const factoryParamObjectPattern = objectPattern(
    factoryParams.map((param) =>
      objectProperty(
        cloneNode(param, true),
        cloneNode(param, true),
        false,
        true
      )
    )
  );

  const factory = functionExpression(
    identifier(workletName + 'Factory'),
    [factoryParamObjectPattern],
    blockStatement(statements)
  );

  const factoryCallArgs = factoryParams.map((param) => cloneNode(param, true));

  const factoryCallParamPack = objectExpression(
    factoryCallArgs.map((param) =>
      objectProperty(
        cloneNode(param, true),
        cloneNode(param, true),
        false,
        true
      )
    )
  );

  updateRelativeRequires(factory, state);

  generateWorkletFile(
    moduleBindingsToImport,
    relativeBindingsToImport,
    factory,
    workletHash,
    state
  );

  return { factoryCallParamPack, workletHash };
}

function stripWorkletDirectives(fun: NodePath<WorkletizableFunction>): void {
  fun.traverse({
    DirectiveLiteral(nodePath) {
      if (
        nodePath.node.value === 'worklet' &&
        nodePath.getFunctionParent() === fun
      ) {
        nodePath.parentPath.remove();
      }
    },
  });
}

function shouldMockVersion(): boolean {
  // We don't want to pollute tests with current version number so we mock it
  // for all tests (except one)
  return process.env.WORKLETS_JEST_SHOULD_MOCK_VERSION === '1';
}

function hash(str: string): number {
  let i = str.length;
  let hash1 = 5381;
  let hash2 = 52711;

  while (i--) {
    const char = str.charCodeAt(i);
    // eslint-disable-next-line no-bitwise
    hash1 = (hash1 * 33) ^ char;
    // eslint-disable-next-line no-bitwise
    hash2 = (hash2 * 33) ^ char;
  }

  // eslint-disable-next-line no-bitwise
  return (hash1 >>> 0) * 4096 + (hash2 >>> 0);
}

function makeWorkletName(
  fun: NodePath<WorkletizableFunction>,
  state: WorkletsPluginPass
): { workletName: string; reactName: string } {
  let source = 'unknownFile';

  if (state.file.opts.filename) {
    const filepath = state.file.opts.filename;
    source = basename(filepath);

    // Get the library name from the path.
    const splitFilepath = filepath.split(/[\\/]/);
    const nodeModulesIndex = splitFilepath.indexOf('node_modules');
    if (nodeModulesIndex !== -1) {
      const libraryName = splitFilepath[nodeModulesIndex + 1];
      source = `${libraryName}_${source}`;
    }
  }

  const suffix = `${source}${state.workletNumber++}`;
  let reactName = '';

  if (isObjectMethod(fun.node) && isIdentifier(fun.node.key)) {
    reactName = fun.node.key.name;
  } else if (
    (isFunctionDeclaration(fun.node) || isFunctionExpression(fun.node)) &&
    isIdentifier(fun.node.id)
  ) {
    reactName = fun.node.id.name;
  }

  const workletName = reactName
    ? toIdentifier(`${reactName}_${suffix}`)
    : toIdentifier(suffix);

  // Fallback for ArrowFunctionExpression and unnamed FunctionExpression.
  reactName = reactName || toIdentifier(suffix);

  return { workletName, reactName };
}

const extraPlugins = [
  require.resolve('@babel/plugin-transform-shorthand-properties'),
  require.resolve('@babel/plugin-transform-arrow-functions'),
  require.resolve('@babel/plugin-transform-optional-chaining'),
  require.resolve('@babel/plugin-transform-nullish-coalescing-operator'),
  [
    require.resolve('@babel/plugin-transform-template-literals'),
    { loose: true },
  ],
];
