import type { NodePath } from '@babel/core';
import type { CallExpression, Program } from '@babel/types';
import {
  callExpression,
  identifier,
  memberExpression,
  stringLiteral,
} from '@babel/types';
import { strict as assert } from 'assert';

import type { ReanimatedPluginPass, WorkletizableFunction } from './types';
import { makeWorkletFactory } from './workletFactory';

export function makeWorkletFactoryCall(
  path: NodePath<WorkletizableFunction>,
  state: ReanimatedPluginPass
): CallExpression {
  const { factoryCallParamPack, workletHash } = makeWorkletFactory(path, state);

  const programPath = path.findParent((ancestorPath) =>
    ancestorPath.isProgram()
  ) as NodePath<Program> | null;
  assert(programPath, 'Program path not found');

  // addWorkletRegistryImports(programPath, state);

  const factoryCall = callExpression(
    memberExpression(
      callExpression(identifier('require'), [
        stringLiteral(`react-native-worklets/generated/${workletHash}.js`),
      ]),
      identifier('default')
    ),

    [factoryCallParamPack]
  );

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
