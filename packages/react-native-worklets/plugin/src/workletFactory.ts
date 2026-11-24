import type { NodePath } from '@babel/core';
import type {
  ArrayExpression,
  ExpressionStatement,
  FunctionExpression,
  ReturnStatement,
  VariableDeclaration,
} from '@babel/types';
import {
  arrayExpression,
  arrayPattern,
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
  returnStatement,
  stringLiteral,
  toIdentifier,
  variableDeclaration,
  variableDeclarator,
} from '@babel/types';
import { strict as assert } from 'assert';
import { basename, dirname, relative, sep } from 'path';

import { getClosure } from './closure';
import { generateWorkletFile } from './generate';
import { updateRelativeRequires } from './imports';
import type { WorkletizableFunction, WorkletsPluginPass } from './types';
import { isRelease } from './utils';

const REAL_VERSION = require('../../package.json').version;

const MOCK_VERSION = 'x.y.z';

export function makeWorkletFactory(
  fun: NodePath<WorkletizableFunction>,
  state: WorkletsPluginPass
): {
  factory: FunctionExpression;
  factoryCallParamPack: ArrayExpression;
  workletHash: number;
} {
  // Returns a new FunctionExpression which is a workletized version of provided
  // FunctionDeclaration, FunctionExpression, ArrowFunctionExpression or ObjectMethod.

  stripWorkletDirectives(fun);

  // We use copy because some of the plugins don't update bindings and
  // some even break them
  assert(state.file.opts.filename, '`state.file.opts.filename` is undefined.');

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

  const { workletName, reactName: initialReactName } = makeWorkletName(
    fun,
    state
  );
  let reactName = initialReactName;
  const importedNames = new Set(
    [...moduleBindingsToImport, ...relativeBindingsToImport].map(
      (binding) => binding.identifier.name
    )
  );
  let factoryName = `${workletName}Factory`;
  while (importedNames.has(factoryName)) {
    factoryName = `_${factoryName}`;
  }
  if (closureVariables.length === 0) {
    // The worklet binding will share module scope with forwarded imports.
    while (importedNames.has(reactName)) {
      reactName = `_${reactName}`;
    }
  }

  const workletHash = hash(makeWorkletHashKey(fun, state));

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
    ...(closureVariables.length > 0
      ? [
          expressionStatement(
            assignmentExpression(
              '=',
              memberExpression(
                identifier(reactName),
                identifier('__closure'),
                false
              ),
              arrayExpression(
                closureVariables.map((variable) => cloneNode(variable, true))
              )
            )
          ),
        ]
      : []),
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

  const factory = functionExpression(
    identifier(factoryName),
    factoryParams.length > 0
      ? [arrayPattern(factoryParams.map((param) => cloneNode(param, true)))]
      : [],
    blockStatement(statements)
  );

  const factoryCallArgs = factoryParams.map((param) => cloneNode(param, true));

  const factoryCallParamPack = arrayExpression(factoryCallArgs);

  if (state.workletModules === 'file') {
    updateRelativeRequires(factory, state);
    generateWorkletFile(
      moduleBindingsToImport,
      relativeBindingsToImport,
      factory,
      workletHash,
      state
    );
  }

  return { factory, factoryCallParamPack, workletHash };
}

function stripWorkletDirectives(fun: NodePath<WorkletizableFunction>): void {
  fun.traverse({
    DirectiveLiteral(nodePath) {
      if (
        (nodePath.node.value === 'worklet' ||
          nodePath.node.value === 'no-worklet-closure') &&
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

function makeWorkletHashKey(
  fun: NodePath<WorkletizableFunction>,
  state: WorkletsPluginPass
): string {
  const filename = state.file.opts.filename;
  const root =
    resolveWorkletsPackageDir() ?? state.file.opts.cwd ?? process.cwd();
  const source = filename
    ? relative(root, filename).split(sep).join('/')
    : 'unknownFile';
  const code = state.file.code;
  const parts = [...fun.node.params, fun.node.body].map((node) =>
    node.start === null ||
    node.start === undefined ||
    node.end === null ||
    node.end === undefined
      ? null
      : code.slice(node.start, node.end)
  );
  if (parts.some((part) => part === null)) {
    return `${source}#${state.workletNumber}`;
  }
  const body = parts.pop();
  const prefix = `${fun.node.async ? 'async ' : ''}${fun.node.generator ? '*' : ''}`;
  return `${source}:${prefix}(${parts.join(',')})${body}`;
}

let cachedWorkletsPackageDir: string | null | undefined;

function resolveWorkletsPackageDir(): string | null {
  if (cachedWorkletsPackageDir === undefined) {
    try {
      cachedWorkletsPackageDir = dirname(
        require.resolve('react-native-worklets/package.json')
      );
    } catch {
      cachedWorkletsPackageDir = null;
    }
  }
  return cachedWorkletsPackageDir;
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
