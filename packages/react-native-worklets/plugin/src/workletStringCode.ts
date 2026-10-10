import type { BabelFileResult, NodePath, PluginItem } from '@babel/core';
import { traverse } from '@babel/core';
import generate from '@babel/generator';
import type {
  File as BabelFile,
  Expression,
  Identifier,
  VariableDeclaration,
} from '@babel/types';
import {
  arrayPattern,
  arrowFunctionExpression,
  assertBlockStatement,
  callExpression,
  functionExpression,
  identifier,
  isArrowFunctionExpression,
  isBlockStatement,
  isExpression,
  isExpressionStatement,
  isFunctionDeclaration,
  isIdentifier,
  isObjectMethod,
  isProgram,
  memberExpression,
  numericLiteral,
  thisExpression,
  variableDeclaration,
  variableDeclarator,
} from '@babel/types';
import { strict as assert } from 'assert';
import * as convertSourceMap from 'convert-source-map';
import * as fs from 'fs';

import { workletTransformSync } from './transform';
import type { WorkletizableFunction, WorkletsPluginPass } from './types';
import { workletClassFactorySuffix } from './types';
import { isRelease } from './utils';

const MOCK_SOURCE_MAP = 'mock source map';
const querySuffixRE = /[?#].*$/;

export function buildWorkletString(
  fun: BabelFile,
  state: WorkletsPluginPass,
  closureVariables: Array<Identifier>,
  workletName: string,
  inputMap: BabelFileResult['map']
): Array<string | null | undefined> {
  restoreRecursiveCalls(fun, workletName);

  const draftExpression =
    fun.program.body.find((obj) => isFunctionDeclaration(obj)) ||
    fun.program.body.find((obj) => isExpressionStatement(obj));

  assert(draftExpression, '`draftExpression` is undefined.');

  const expression = isFunctionDeclaration(draftExpression)
    ? draftExpression
    : draftExpression.expression;

  assert(
    'params' in expression,
    "'params' property is undefined in 'expression'"
  );
  assert(
    isBlockStatement(expression.body),
    '`expression.body` is not a `BlockStatement`'
  );

  const parsedClasses = new Set<string>();

  if (!state.opts.disableWorkletClasses) {
    traverse(fun, {
      NewExpression(path) {
        if (!isIdentifier(path.node.callee)) {
          return;
        }
        const constructorName = path.node.callee.name;
        if (
          !closureVariables.some(
            (variable) => variable.name === constructorName
          ) ||
          parsedClasses.has(constructorName)
        ) {
          return;
        }
        const index = closureVariables.findIndex(
          (variable) => variable.name === constructorName
        );
        closureVariables.splice(index, 1);
        const workletClassFactoryName =
          constructorName + workletClassFactorySuffix;
        closureVariables.push(identifier(workletClassFactoryName));

        assertBlockStatement(expression.body);
        expression.body.body.unshift(
          variableDeclaration('const', [
            variableDeclarator(
              identifier(constructorName),
              callExpression(identifier(workletClassFactoryName), [])
            ),
          ])
        );
        parsedClasses.add(constructorName);
      },
    });
  }

  const workletFunction = functionExpression(
    identifier(workletName),
    expression.params,
    expression.body,
    expression.generator,
    expression.async
  );

  traverse(fun, {
    Directive(path) {
      path.remove();
    },
  });

  const code = generate(workletFunction).code;

  assert(inputMap, '`inputMap` is undefined.');

  const includeSourceMap = !(isRelease(state) || state.opts.disableSourceMaps);

  if (includeSourceMap) {
    // Clear contents array (should be empty anyways)
    inputMap.sourcesContent = [];
    // Include source contents in source map, because Flipper/iframe is not
    // allowed to read files from disk.
    for (const sourceFile of inputMap.sources) {
      inputMap.sourcesContent.push(
        fs.readFileSync(sourceFile.replace(querySuffixRE, '')).toString('utf-8')
      );
    }
  }

  const transformed = workletTransformSync(code, {
    filename: state.file.opts.filename,
    extraPlugins: [
      getClosurePlugin(closureVariables, parsedClasses),
      ...(state.opts.extraPlugins ?? []),
    ],
    extraPresets: state.opts.extraPresets,
    compact: true,
    sourceMaps: includeSourceMap,
    inputSourceMap: inputMap,
    ast: false,
    babelrc: false,
    configFile: false,
    comments: false,
  });

  assert(transformed, '`transformed` is null.');

  let sourceMap;
  if (includeSourceMap) {
    if (shouldMockSourceMap()) {
      sourceMap = MOCK_SOURCE_MAP;
    } else {
      sourceMap = convertSourceMap.fromObject(transformed.map).toObject();
      // sourcesContent field contains a full source code of the file which contains the worklet
      // and is not needed by the source map interpreter in order to symbolicate a stack trace.
      // Therefore, we remove it to reduce the bandwith and avoid sending it potentially multiple times
      // in files that contain multiple worklets. Along with sourcesContent.
      delete sourceMap.sourcesContent;
    }
  }

  const wrappedCode = `(${transformed.code})`;

  return [wrappedCode, JSON.stringify(sourceMap)];
}

/**
 * Function that restores recursive calls after the name of the worklet has
 * changed.
 */
function restoreRecursiveCalls(file: BabelFile, newName: string): void {
  traverse(file, {
    FunctionExpression(path) {
      if (!path.node.id) {
        // Function wasn't named, hence it couldn't have had recursive calls by its name.
        path.stop();
        return;
      }
      const oldName = path.node.id.name;
      const scope = path.scope;
      scope.rename(oldName, newName);
    },
  });
}

function shouldMockSourceMap() {
  // We don't want to pollute tests with source maps so we mock it
  // for all tests (except one)
  return process.env.WORKLETS_JEST_SHOULD_MOCK_SOURCE_MAP === '1';
}

function prependClosure(
  path: NodePath<WorkletizableFunction>,
  closureVariables: Array<Identifier>,
  closureDeclaration: VariableDeclaration
) {
  if (closureVariables.length === 0 || !isProgram(path.parent)) {
    return;
  }

  if (!isExpression(path.node.body)) {
    path.node.body.body.unshift(closureDeclaration);
  }
}

function readRecursiveName(
  path: NodePath<WorkletizableFunction>
): string | undefined {
  if (
    isProgram(path.parent) &&
    !isArrowFunctionExpression(path.node) &&
    !isObjectMethod(path.node) &&
    path.node.id &&
    path.scope.parent &&
    path.scope.parent.bindings[path.node.id.name]?.references > 0
  ) {
    return path.node.id.name;
  }
  return undefined;
}

function prependRecursiveDeclaration(path: NodePath<WorkletizableFunction>) {
  const recursiveName = readRecursiveName(path);
  if (recursiveName !== undefined && !isExpression(path.node.body)) {
    path.node.body.body.unshift(
      variableDeclaration('const', [
        variableDeclarator(
          identifier(recursiveName),
          memberExpression(thisExpression(), identifier('_recur'))
        ),
      ])
    );
  }
}

/**
 * Parameter expressions run before the body, in a scope that cannot see the
 * closure, worklet-class and recursion bindings declared at the top of the
 * body, so they read those values from where the body takes them.
 */
function readBodyBindingsInParameters(
  path: NodePath<WorkletizableFunction>,
  closureVariables: Array<Identifier>,
  parsedClasses: ReadonlySet<string>
) {
  if (!isProgram(path.parent)) {
    return;
  }

  const readers = new Map<string, () => Expression>();
  closureVariables.forEach((variable, index) => {
    const readCapture = () =>
      memberExpression(
        memberExpression(thisExpression(), identifier('__closure')),
        numericLiteral(index),
        true
      );
    const className = variable.name.endsWith(workletClassFactorySuffix)
      ? variable.name.slice(0, -workletClassFactorySuffix.length)
      : undefined;
    if (className !== undefined && parsedClasses.has(className)) {
      readers.set(className, () => callExpression(readCapture(), []));
    } else {
      readers.set(variable.name, readCapture);
    }
  });
  const recursiveName = readRecursiveName(path);
  if (recursiveName !== undefined) {
    readers.set(recursiveName, () =>
      memberExpression(thisExpression(), identifier('_recur'))
    );
  }

  const expressionsToWrap = new Map<
    NodePath<Expression>,
    Map<string, () => Expression>
  >();
  for (const parameter of path.get('params')) {
    parameter.traverse({
      ReferencedIdentifier(reference) {
        if (!reference.isIdentifier()) {
          return;
        }
        const name = reference.node.name;
        const read = readers.get(name);
        const binding = reference.scope.getBinding(name);
        const readsBodyBinding = binding === undefined || binding.path === path;
        if (read === undefined || !readsBodyBinding) {
          return;
        }
        const thisBindingExpression = findOutermostThisBindingExpression(
          reference,
          path
        );
        if (thisBindingExpression === undefined) {
          reference.replaceWith(read());
          return;
        }
        const reads =
          expressionsToWrap.get(thisBindingExpression) ??
          new Map<string, () => Expression>();
        reads.set(name, read);
        expressionsToWrap.set(thisBindingExpression, reads);
      },
    });
  }

  for (const [expression, reads] of expressionsToWrap) {
    expression.replaceWith(
      callExpression(
        arrowFunctionExpression(
          [...reads.keys()].map((name) => identifier(name)),
          expression.node
        ),
        [...reads.values()].map((read) => read())
      )
    );
  }
}

/**
 * The outermost expression between a parameter reference and the worklet that
 * holds a function binding its own `this`, through which a read of
 * `this.__closure` would not reach the worklet's.
 */
function findOutermostThisBindingExpression(
  reference: NodePath,
  worklet: NodePath<WorkletizableFunction>
): NodePath<Expression> | undefined {
  let thisBinder: NodePath | undefined;
  for (
    let ancestor = reference.parentPath;
    ancestor !== null && ancestor !== worklet;
    ancestor = ancestor.parentPath
  ) {
    if (
      (ancestor.isFunction() && !ancestor.isArrowFunctionExpression()) ||
      ancestor.isClass()
    ) {
      thisBinder = ancestor;
    }
  }
  const expression = thisBinder?.find((ancestor) => ancestor.isExpression());
  return expression?.isExpression() ? expression : undefined;
}

/** Prepends necessary closure variables to the worklet function. */
function getClosurePlugin(
  closureVariables: Array<Identifier>,
  parsedClasses: ReadonlySet<string>
): PluginItem {
  const closureDeclaration = variableDeclaration('const', [
    variableDeclarator(
      arrayPattern(
        closureVariables.map((variable) => identifier(variable.name))
      ),
      memberExpression(thisExpression(), identifier('__closure'))
    ),
  ]);

  return {
    visitor: {
      'FunctionDeclaration|FunctionExpression|ArrowFunctionExpression|ObjectMethod':
        (path: NodePath<WorkletizableFunction>) => {
          readBodyBindingsInParameters(path, closureVariables, parsedClasses);
          prependClosure(path, closureVariables, closureDeclaration);
          prependRecursiveDeclaration(path);
        },
    },
  };
}
