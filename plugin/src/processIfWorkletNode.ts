import type { NodePath } from '@babel/core';
import {
  isBlockStatement,
  isDirectiveLiteral,
  objectProperty,
  variableDeclaration,
  variableDeclarator,
  isScopable,
  isExportNamedDeclaration,
} from '@babel/types';
import type {
  Directive,
  ObjectMethod,
  CallExpression,
  FunctionDeclaration,
} from '@babel/types';
import { makeWorkletFactoryCall } from './processIfWorkletFunction';
import type { ReanimatedPluginPass } from './types';
import { WorkletizableFunction } from './types';

/**
 *
 * @returns `true` if the function was workletized, `false` otherwise.
 */
export function processIfWithWorkletDirective(
  path: NodePath<WorkletizableFunction>,
  state: ReanimatedPluginPass
): boolean {
  if (!isBlockStatement(path.node.body)) {
    // If the function body is not a block statement we can safely assume that it's not a worklet
    // since it's the case of an arrow function with immediate return
    // eg. `const foo = () => 1;`
    return false;
  }
  if (!hasWorkletDirective(path.node.body.directives)) {
    return false;
  }
  processWorklet(path, state);
  return true;
}

/**
 * Replaces
 * - `FunctionDeclaration`,
 * - `FunctionExpression`,
 * - `ArrowFunctionExpression`
 * - `ObjectMethod`
 *
 * with a workletized version of itself.
 */
export function processWorklet(
  path: NodePath<WorkletizableFunction>,
  state: ReanimatedPluginPass
): void {
  if (state.opts.processNestedWorklets) {
    path.traverse(
      {
        // @ts-expect-error TypeScript doesn't like this syntax here.
        [WorkletizableFunction](
          subPath: NodePath<WorkletizableFunction>,
          passedState: ReanimatedPluginPass
        ): void {
          processIfWithWorkletDirective(subPath, passedState);
        },
      },
      state
    );
  }

  const workletFactoryCall = makeWorkletFactoryCall(path, state);

  substituteWithWorkletFactoryCall(path, workletFactoryCall);
}

function hasWorkletDirective(directives: Directive[]): boolean {
  return directives.some(
    (directive) =>
      isDirectiveLiteral(directive.value) && directive.value.value === 'worklet'
  );
}

function substituteWithWorkletFactoryCall(
  path: NodePath<WorkletizableFunction>,
  workletFactoryCall: CallExpression
): void {
  if (path.isObjectMethod()) {
    substituteObjectMethodWithObjectProperty(path, workletFactoryCall);
  } else if (path.isFunctionDeclaration()) {
    maybeSubstituteFunctionDeclarationWithVariableDeclaration(
      path,
      workletFactoryCall
    );
  } else {
    path.replaceWith(workletFactoryCall);
  }
}

export function substituteObjectMethodWithObjectProperty(
  path: NodePath<ObjectMethod>,
  workletFactoryCall: CallExpression
): void {
  const replacement = objectProperty(path.node.key, workletFactoryCall);
  path.replaceWith(replacement);
}

export function maybeSubstituteFunctionDeclarationWithVariableDeclaration(
  path: NodePath<FunctionDeclaration>,
  workletFactoryCall: CallExpression
): void {
  // We check if function needs to be assigned to variable declaration.
  // This is needed if function definition directly in a scope. Some other ways
  // where function definition can be used is for example with variable declaration:
  //
  // const bar = function foo() {'worklet' ...};
  //
  // In such a case we don't need to define variable for the function.
  const needDeclaration =
    isScopable(path.parent) || isExportNamedDeclaration(path.parent);

  const replacement =
    'id' in path.node && path.node.id && needDeclaration
      ? variableDeclaration('const', [
          variableDeclarator(path.node.id, workletFactoryCall),
        ])
      : workletFactoryCall;

  path.replaceWith(replacement);
}
