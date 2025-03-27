import type { NodePath } from '@babel/core';
import type { CallExpression, Program } from '@babel/types';
import {
  callExpression,
  identifier,
  importDeclaration,
  importSpecifier,
  memberExpression,
  numericLiteral,
  stringLiteral,
} from '@babel/types';
import { strict as assert } from 'assert';

import type { ReanimatedPluginPass, WorkletizableFunction } from './types';
import { makeWorkletFactory } from './workletFactory';

export function makeWorkletFactoryCall(
  path: NodePath<WorkletizableFunction>,
  state: ReanimatedPluginPass
): CallExpression {
  const { factoryParams, workletHash } = makeWorkletFactory(path, state);

  const programPath = path.findParent((ancestorPath) =>
    ancestorPath.isProgram()
  ) as NodePath<Program> | null;
  assert(programPath, 'Program path not found');

  addWorkletRegistryImports(programPath);

  const workletFactoryCall = callExpression(identifier('__getWorklet'), [
    numericLiteral(workletHash),
    ...factoryParams,
  ]);

  // const workletFactoryCall = callExpression(
  //   memberExpression(
  //     callExpression(identifier('require'), [
  //       stringLiteral('react-native-worklets'),
  //     ]),
  //     identifier('__getWorklet')
  //   ),
  //   [numericLiteral(workletHash), ...factoryParams]
  // );

  // const workletFactoryCall = callExpression(
  //   memberExpression(identifier('globalThis'), identifier('__getWorklet')),
  //   [numericLiteral(workletHash), ...factoryParams]
  // );

  // if (path.scope.hasReference('registerWorkletFactory')) {
  //   console.log(
  //     'registerWorkletFactory is referenced',
  //     path.scope.getBinding('__registerWorkletFactory')
  //   );
  // } else {
  //   console.log('__registerWorkletFactory is not referenced');
  // }

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
      filename: originalWorkletLocation.filename,
      identifierName: originalWorkletLocation.identifierName,
      start: originalWorkletLocation.start,
      end: originalWorkletLocation.start,
    };
  }
}

// let hasVisited = false;

function addWorkletRegistryImports(path: NodePath<Program>): void {
  const registerName = '__registerWorkletFactory';
  const invokeFactoryName = '__getWorklet';
  const registerNameBinding = path.scope.getBinding(registerName);
  const invokeFactoryNameBinding = path.scope.getBinding(invokeFactoryName);
  if (registerNameBinding && invokeFactoryNameBinding) {
    return;
  }

  path.node.body.unshift(
    importDeclaration(
      [
        importSpecifier(identifier(registerName), identifier(registerName)),
        importSpecifier(
          identifier(invokeFactoryName),
          identifier(invokeFactoryName)
        ),
      ],
      stringLiteral('react-native-worklets/src/workletRegistry')
    )
  );

  // if (!hasVisited) {
  //   hasVisited = true;
  //   path.visit();
  // }
}
