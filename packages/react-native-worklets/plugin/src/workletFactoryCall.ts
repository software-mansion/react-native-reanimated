import type { NodePath } from '@babel/core';
import type { CallExpression } from '@babel/types';
import { callExpression } from '@babel/types';

import type { ReanimatedPluginPass, WorkletizableFunction } from './types';
import { makeWorkletFactory } from './workletFactory';

export function makeWorkletFactoryCall(
  path: NodePath<WorkletizableFunction>,
  state: ReanimatedPluginPass
): CallExpression {
  const { factory, factoryCallParamPack } = makeWorkletFactory(path, state);

  const factoryCall = callExpression(factory, [factoryCallParamPack]);

  addStackTraceDataToWorkletFactory(path, factoryCall);

  const replacement = factoryCall;

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
      filename: originalWorkletLocation.filename,
      identifierName: originalWorkletLocation.identifierName,
      start: originalWorkletLocation.start,
      end: originalWorkletLocation.start,
    };
  }
}
