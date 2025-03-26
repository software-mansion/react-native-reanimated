import type { NodePath } from '@babel/core';
import type { CallExpression, Directive, ObjectMethod } from '@babel/types';
import {
  isBlockStatement,
  isDirectiveLiteral,
  objectProperty,
} from '@babel/types';

import type { ReanimatedPluginPass } from './types';
import { WorkletizableFunction } from './types';
import { replaceWithFactoryCall } from './utils';
import { makeWorkletFactoryCall } from './workletFactoryCall';

/** @returns `true` if the function was workletized, `false` otherwise. */
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
 *
 * - `FunctionDeclaration`,
 * - `FunctionExpression`,
 * - `ArrowFunctionExpression`
 * - `ObjectMethod`
 *
 * With a workletized version of itself.
 */
export function processWorklet(
  path: NodePath<WorkletizableFunction>,
  state: ReanimatedPluginPass
): void {
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

  const workletFactoryCall = makeWorkletFactoryCall(path, state);

  substituteWorkletWithWorkletFactoryCall(path, workletFactoryCall);
}

function hasWorkletDirective(directives: Directive[]): boolean {
  return directives.some(
    (directive) =>
      isDirectiveLiteral(directive.value) && directive.value.value === 'worklet'
  );
}

function substituteWorkletWithWorkletFactoryCall(
  path: NodePath<WorkletizableFunction>,
  workletFactoryCall: CallExpression
): void {
  if (path.isObjectMethod()) {
    substituteObjectMethodWithObjectProperty(path, workletFactoryCall);
  } else {
    const name = 'id' in path.node ? path.node.id?.name : undefined;
    replaceWithFactoryCall(path, name, workletFactoryCall);
  }
}

export function substituteObjectMethodWithObjectProperty(
  path: NodePath<ObjectMethod>,
  workletFactoryCall: CallExpression
): void {
  const replacement = objectProperty(path.node.key, workletFactoryCall);
  path.replaceWith(replacement);
}
