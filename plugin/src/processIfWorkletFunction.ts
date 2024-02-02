import type { NodePath } from '@babel/core';
import { callExpression } from '@babel/types';
import type { CallExpression } from '@babel/types';
import type { ReanimatedPluginPass, WorkletizableFunction } from './types';
import { makeWorkletFactory } from './makeWorklet';

export function makeWorkletFactoryCall(
  path: NodePath<WorkletizableFunction>,
  state: ReanimatedPluginPass
): CallExpression {
  const workletFactory = makeWorkletFactory(path, state);

  const workletFactoryCall = callExpression(workletFactory, []);

  addStackTraceDataToWorkletFactory(path, workletFactoryCall);

  const replacement = workletFactoryCall;

  return replacement;
}

/* 
  If for some reason the code of the worklet is so bad that it
  causes the worklet factory to crash, eg.:

  function foo() {
    'worklet'
    unexistingVariable;
  };

  Such function will cause the factory to crash on closure creation because
  of reference to `unexistingVariable`.
  
  With this we are able to give a meaningful stack trace - we use `start` twice on purpose, since
  crashing on the factory leads to its end on the stack trace - the closing bracket. It's more
  approachable this way, when it points to the start of the original function.
  */
function addStackTraceDataToWorkletFactory(
  path: NodePath<WorkletizableFunction>,
  workletFactoryCall: CallExpression
): void {
  const originalWorkletLocation = path.node.loc;
  if (originalWorkletLocation) {
    workletFactoryCall.callee.loc = {
      start: originalWorkletLocation.start,
      end: originalWorkletLocation.start,
    };
  }
}
