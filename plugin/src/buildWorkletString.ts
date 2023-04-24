import {
  BabelFileResult,
  NodePath,
  transformSync,
  PluginItem,
} from '@babel/core';
import generate from '@babel/generator';
import {
  ObjectMethod,
  isObjectMethod,
  FunctionDeclaration,
  FunctionExpression,
  ArrowFunctionExpression,
  identifier,
  Identifier,
  objectProperty,
  isArrowFunctionExpression,
  variableDeclaration,
  variableDeclarator,
  isBlockStatement,
  functionExpression,
  isFunctionDeclaration,
  VariableDeclaration,
  ExpressionStatement,
  isProgram,
  memberExpression,
  File as BabelFile,
  objectPattern,
  thisExpression,
  isExpression,
  isExpressionStatement,
} from '@babel/types';
import * as fs from 'fs';
import * as convertSourceMap from 'convert-source-map';
import { strict as assert } from 'assert';
import { isRelease } from './utils';

export function buildWorkletString(
  fun: BabelFile,
  closureVariables: Array<Identifier>,
  name: string,
  inputMap: BabelFileResult['map']
): Array<string | null | undefined> {
  const draftExpression = (fun.program.body.find((obj) =>
    isFunctionDeclaration(obj)
  ) ||
    fun.program.body.find((obj) => isExpressionStatement(obj)) ||
    undefined) as FunctionDeclaration | ExpressionStatement | undefined;

  assert(draftExpression, "'draftExpression' is undefined");

  const expression = isFunctionDeclaration(draftExpression)
    ? draftExpression
    : draftExpression.expression;

  assert(
    'params' in expression,
    "'params' property is undefined in 'expression'"
  );
  assert(
    isBlockStatement(expression.body),
    "'expression.body' is not a 'BlockStatement'"
  );

  const workletFunction = functionExpression(
    identifier(name),
    expression.params,
    expression.body
  );

  const code = generate(workletFunction).code;

  assert(inputMap, "'inputMap' is undefined");

  const includeSourceMap = shouldGenerateSourceMap();

  if (includeSourceMap) {
    // Clear contents array (should be empty anyways)
    inputMap.sourcesContent = [];
    // Include source contents in source map, because Flipper/iframe is not
    // allowed to read files from disk.
    for (const sourceFile of inputMap.sources) {
      inputMap.sourcesContent.push(
        fs.readFileSync(sourceFile).toString('utf-8')
      );
    }
  }

  const transformed = transformSync(code, {
    plugins: [prependClosureVariablesIfNecessary(closureVariables)],
    compact: !includeSourceMap,
    sourceMaps: includeSourceMap,
    inputSourceMap: inputMap,
    ast: false,
    babelrc: false,
    configFile: false,
    comments: false,
  });

  assert(transformed, "'transformed' is null");

  let sourceMap;
  if (includeSourceMap) {
    sourceMap = convertSourceMap.fromObject(transformed.map).toObject();
    // sourcesContent field contains a full source code of the file which contains the worklet
    // and is not needed by the source map interpreter in order to symbolicate a stack trace.
    // Therefore, we remove it to reduce the bandwith and avoid sending it potentially multiple times
    // in files that contain multiple worklets. Along with sourcesContent.
    delete sourceMap.sourcesContent;
  }

  return [transformed.code, JSON.stringify(sourceMap)];
}

function shouldGenerateSourceMap() {
  if (isRelease()) {
    return false;
  }

  // We want to detect this, so we can disable source maps (because they break
  // snapshot tests with jest).
  if (process.env.REANIMATED_JEST_DISABLE_SOURCEMAP === 'jest') {
    return false;
  }

  return true;
}

function prependClosure(
  path: NodePath<
    | FunctionDeclaration
    | FunctionExpression
    | ArrowFunctionExpression
    | ObjectMethod
  >,
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

function prependRecursiveDeclaration(
  path: NodePath<
    | FunctionDeclaration
    | FunctionExpression
    | ArrowFunctionExpression
    | ObjectMethod
  >
) {
  if (
    isProgram(path.parent) &&
    !isArrowFunctionExpression(path.node) &&
    !isObjectMethod(path.node) &&
    path.node.id &&
    path.scope.parent
  ) {
    const hasRecursiveCalls =
      path.scope.parent.bindings[path.node.id.name]?.references > 0;
    if (hasRecursiveCalls) {
      path.node.body.body.unshift(
        variableDeclaration('const', [
          variableDeclarator(
            identifier(path.node.id.name),
            memberExpression(thisExpression(), identifier('_recur'))
          ),
        ])
      );
    }
  }
}

function prependClosureVariablesIfNecessary(
  closureVariables: Array<Identifier>
): PluginItem {
  const closureDeclaration = variableDeclaration('const', [
    variableDeclarator(
      objectPattern(
        closureVariables.map((variable) =>
          objectProperty(
            identifier(variable.name),
            identifier(variable.name),
            false,
            true
          )
        )
      ),
      memberExpression(thisExpression(), identifier('_closure'))
    ),
  ]);

  return {
    visitor: {
      'FunctionDeclaration|FunctionExpression|ArrowFunctionExpression|ObjectMethod':
        (
          path: NodePath<
            | FunctionDeclaration
            | FunctionExpression
            | ArrowFunctionExpression
            | ObjectMethod
          >
        ) => {
          prependClosure(path, closureVariables, closureDeclaration);
          prependRecursiveDeclaration(path);
        },
    },
  };
}
