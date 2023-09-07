import type { NodePath } from '@babel/core';
import type { Expression } from '@babel/types';
import {
  isIdentifier,
  isCallExpression,
  isMemberExpression,
  isExpression,
} from '@babel/types';
import type { ExplicitWorklet } from './types';

const gestureHandlerGestureObjects = new Set([
  'Tap',
  'Pan',
  'Pinch',
  'Rotation',
  'Fling',
  'LongPress',
  'ForceTouch',
  'Native',
  'Manual',
  'Race',
  'Simultaneous',
  'Exclusive',
  'Hover',
]);

const gestureHandlerBuilderMethods = new Set([
  'onBegin',
  'onStart',
  'onEnd',
  'onFinalize',
  'onUpdate',
  'onChange',
  'onTouchesDown',
  'onTouchesMove',
  'onTouchesUp',
  'onTouchesCancelled',
]);

// Auto-workletizes React Native Gesture Handler callback functions.
// Detects `Gesture.Tap().onEnd(<fun>)` or similar, but skips `something.onEnd(<fun>)`.
// Supports method chaining as well, e.g. `Gesture.Tap().onStart(<fun1>).onUpdate(<fun2>).onEnd(<fun3>)`.

// Example #1: `Gesture.Tap().onEnd(<fun>)`
/*
  CallExpression(
    callee: MemberExpression(
      object: CallExpression(
        callee: MemberExpression(
          object: Identifier('Gesture')
          property: Identifier('Tap')
        )
      )
      property: Identifier('onEnd')
    )
    arguments: [fun]
  )
  */

// Example #2: `Gesture.Tap().onStart(<fun1>).onUpdate(<fun2>).onEnd(<fun3>)`
/*
  CallExpression(
    callee: MemberExpression(
      object: CallExpression(
        callee: MemberExpression(
          object: CallExpression(
            callee: MemberExpression(
              object: CallExpression(
                callee: MemberExpression(
                  object: Identifier('Gesture')
                  property: Identifier('Tap')
                )
              )
              property: Identifier('onStart')
            )
            arguments: [fun1]
          )
          property: Identifier('onUpdate')
        )
        arguments: [fun2]
      )
      property: Identifier('onEnd')
    )
    arguments: [fun3]
  )
  */
export function isGestureHandlerEventCallback(path: NodePath<ExplicitWorklet>) {
  return (
    isCallExpression(path.parent) &&
    isExpression(path.parent.callee) &&
    isGestureObjectEventCallbackMethod(path.parent.callee)
  );
}

function isGestureObjectEventCallbackMethod(exp: Expression) {
  // Checks if node matches the pattern `Gesture.Foo()[*].onBar`
  // where `[*]` represents any number of method calls.
  return (
    isMemberExpression(exp) &&
    isIdentifier(exp.property) &&
    gestureHandlerBuilderMethods.has(exp.property.name) &&
    containsGestureObject(exp.object)
  );
}

function containsGestureObject(exp: Expression) {
  // Checks if node matches the pattern `Gesture.Foo()[*]`
  // where `[*]` represents any number of chained method calls, like `.something(42)`.

  // direct call
  if (isGestureObject(exp)) {
    return true;
  }

  // method chaining
  if (
    isCallExpression(exp) &&
    isMemberExpression(exp.callee) &&
    containsGestureObject(exp.callee.object)
  ) {
    return true;
  }

  return false;
}

function isGestureObject(exp: Expression) {
  // Checks if node matches `Gesture.Tap()` or similar.
  /*
  node: CallExpression(
    callee: MemberExpression(
      object: Identifier('Gesture')
      property: Identifier('Tap')
    )
  )
  */
  return (
    isCallExpression(exp) &&
    isMemberExpression(exp.callee) &&
    isIdentifier(exp.callee.object) &&
    exp.callee.object.name === 'Gesture' &&
    isIdentifier(exp.callee.property) &&
    gestureHandlerGestureObjects.has(exp.callee.property.name)
  );
}
