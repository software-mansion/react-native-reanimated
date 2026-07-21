import type { NodePath, PluginItem } from '@babel/core';
import { traverse } from '@babel/core';
import generate from '@babel/generator';
import type {
  File as BabelFile,
  Identifier,
  VariableDeclaration,
} from '@babel/types';
import {
  functionExpression,
  identifier,
  isArrowFunctionExpression,
  isBlockStatement,
  isExpression,
  isExpressionStatement,
  isFunctionDeclaration,
  isObjectMethod,
  isProgram,
  memberExpression,
  objectPattern,
  objectProperty,
  thisExpression,
  variableDeclaration,
  variableDeclarator,
} from '@babel/types';
import { strict as assert } from 'assert';

import { workletTransformSync } from './transform';
import type { WorkletizableFunction, WorkletsPluginPass } from './types';

export function buildWorkletString(
  fun: BabelFile,
  state: WorkletsPluginPass,
  closureVariables: Array<Identifier>,
  workletName: string
): string {
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

  const workletFunction = functionExpression(
    identifier(workletName),
    expression.params,
    expression.body,
    expression.generator,
    expression.async
  );

  const code = generate(workletFunction).code;

  const transformed = workletTransformSync(code, {
    filename: state.file.opts.filename,
    extraPlugins: [
      getClosurePlugin(closureVariables),
      ...(state.opts.extraPlugins ?? []),
    ],
    extraPresets: state.opts.extraPresets,
    compact: true,
    ast: false,
    babelrc: false,
    configFile: false,
    comments: false,
  });

  assert(transformed, '`transformed` is null.');

  return `(${transformed.code})`;
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

function prependRecursiveDeclaration(path: NodePath<WorkletizableFunction>) {
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

/** Prepends necessary closure variables to the worklet function. */
function getClosurePlugin(closureVariables: Array<Identifier>): PluginItem {
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
      memberExpression(thisExpression(), identifier('__closure'))
    ),
  ]);

  return {
    visitor: {
      'FunctionDeclaration|FunctionExpression|ArrowFunctionExpression|ObjectMethod':
        (path: NodePath<WorkletizableFunction>) => {
          prependClosure(path, closureVariables, closureDeclaration);
          prependRecursiveDeclaration(path);
        },
    },
  };
}
