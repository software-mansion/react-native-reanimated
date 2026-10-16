import type { BabelFileResult, NodePath, PluginItem } from '@babel/core';
import { traverse } from '@babel/core';
import generate from '@babel/generator';
import type {
  File as BabelFile,
  Identifier,
  VariableDeclaration,
} from '@babel/types';
import {
  arrayPattern,
  assertBlockStatement,
  blockStatement,
  callExpression,
  functionExpression,
  identifier,
  isArrowFunctionExpression,
  isAssignmentPattern,
  isBlockStatement,
  isExpression,
  isExpressionStatement,
  isFunctionDeclaration,
  isIdentifier,
  isObjectMethod,
  isProgram,
  isRestElement,
  memberExpression,
  returnStatement,
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

function getRecursiveName(
  path: NodePath<WorkletizableFunction>
): string | undefined {
  if (
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

/**
 * Declares what the worklet reads from outside its code: its own name, its
 * captures and its worklet classes.
 */
function buildPrologue(
  closureVariables: Array<Identifier>,
  parsedClasses: ReadonlySet<string>,
  recursiveName: string | undefined
): Array<VariableDeclaration> {
  return [
    ...(recursiveName !== undefined
      ? [
          variableDeclaration('const', [
            variableDeclarator(
              identifier(recursiveName),
              memberExpression(thisExpression(), identifier('_recur'))
            ),
          ]),
        ]
      : []),
    ...(closureVariables.length > 0
      ? [
          variableDeclaration('const', [
            variableDeclarator(
              arrayPattern(
                closureVariables.map((variable) => identifier(variable.name))
              ),
              memberExpression(thisExpression(), identifier('__closure'))
            ),
          ]),
        ]
      : []),
    ...[...parsedClasses]
      .reverse()
      .map((className) =>
        variableDeclaration('const', [
          variableDeclarator(
            identifier(className),
            callExpression(
              identifier(className + workletClassFactorySuffix),
              []
            )
          ),
        ])
      ),
  ];
}

function readsPrologueInParameters(
  path: NodePath<WorkletizableFunction>,
  prologueNames: ReadonlySet<string>
): boolean {
  let reads = false;
  for (const parameter of path.get('params')) {
    parameter.traverse({
      ReferencedIdentifier(reference) {
        if (!reference.isIdentifier()) {
          return;
        }
        const name = reference.node.name;
        const binding = reference.scope.getBinding(name);
        if (
          prologueNames.has(name) &&
          (binding === undefined || binding.path === path)
        ) {
          reads = true;
          reference.stop();
        }
      },
    });
  }
  return reads;
}

/**
 * Parameters cannot see what the body declares, so the prologue goes in a
 * function that encloses the original one, where the source's outer scope was.
 */
function encloseInPrologue(
  path: NodePath<WorkletizableFunction>,
  prologue: Array<VariableDeclaration>
) {
  const { node } = path;
  assertBlockStatement(node.body);
  const firstOptionalIndex = node.params.findIndex(
    (parameter) => isAssignmentPattern(parameter) || isRestElement(parameter)
  );
  const placeholders = Array.from(
    {
      length:
        firstOptionalIndex === -1 ? node.params.length : firstOptionalIndex,
    },
    () => path.scope.generateUidIdentifier('argument')
  );
  const enclosed = functionExpression(
    null,
    node.params,
    node.body,
    node.generator,
    node.async
  );
  node.params = placeholders;
  node.generator = false;
  node.async = false;
  node.body = blockStatement([
    ...prologue,
    returnStatement(
      callExpression(memberExpression(enclosed, identifier('apply')), [
        thisExpression(),
        identifier('arguments'),
      ])
    ),
  ]);
}

/**
 * Prepends the prologue to the worklet, or encloses the worklet in it when a
 * parameter reads it.
 */
function getClosurePlugin(
  closureVariables: Array<Identifier>,
  parsedClasses: ReadonlySet<string>
): PluginItem {
  return {
    visitor: {
      'FunctionDeclaration|FunctionExpression|ArrowFunctionExpression|ObjectMethod':
        (path: NodePath<WorkletizableFunction>) => {
          if (!isProgram(path.parent) || isExpression(path.node.body)) {
            return;
          }
          const recursiveName = getRecursiveName(path);
          const prologue = buildPrologue(
            closureVariables,
            parsedClasses,
            recursiveName
          );
          const prologueNames = new Set([
            ...closureVariables.map((variable) => variable.name),
            ...parsedClasses,
            ...(recursiveName !== undefined ? [recursiveName] : []),
          ]);
          if (readsPrologueInParameters(path, prologueNames)) {
            encloseInPrologue(path, prologue);
            return;
          }
          path.node.body.body.unshift(...prologue);
        },
    },
  };
}
