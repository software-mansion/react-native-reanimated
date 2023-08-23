import type { NodePath } from '@babel/core';
import type {
  FunctionDeclaration,
  FunctionExpression,
  ArrowFunctionExpression,
  Expression,
} from '@babel/types';
import {
  isIdentifier,
  isCallExpression,
  isMemberExpression,
  isExpression,
  isNewExpression,
} from '@babel/types';

const EntryExitAnimations = new Set([
  'BounceIn',
  'BounceInDown',
  'BounceInLeft',
  'BounceInRight',
  'BounceInUp',
  'BounceOut',
  'BounceOutDown',
  'BounceOutLeft',
  'BounceOutRight',
  'BounceOutUp',
  'FadeIn',
  'FadeInDown',
  'FadeInLeft',
  'FadeInRight',
  'FadeInUp',
  'FadeOut',
  'FadeOutDown',
  'FadeOutLeft',
  'FadeOutRight',
  'FadeOutUp',
  'FlipInEasyX',
  'FlipInEasyY',
  'FlipInXDown',
  'FlipInXUp',
  'FlipInYLeft',
  'FlipInYRight',
  'FlipOutEasyX',
  'FlipOutEasyY',
  'FlipOutXDown',
  'FlipOutXUp',
  'FlipOutYLeft',
  'FlipOutYRight',
  'LightSpeedInLeft',
  'LightSpeedInRight',
  'LightSpeedOutLeft',
  'LightSpeedOutRight',
  'PinwheelIn',
  'PinwheelOut',
  'RollInLeft',
  'RollInRight',
  'RollOutLeft',
  'RollOutRight',
  'RotateInDownLeft',
  'RotateInDownRight',
  'RotateInUpLeft',
  'RotateInUpRight',
  'RotateOutDownLeft',
  'RotateOutDownRight',
  'RotateOutUpLeft',
  'RotateOutUpRight',
  'SlideInDown',
  'SlideInLeft',
  'SlideInRight',
  'SlideInUp',
  'SlideOutDown',
  'SlideOutLeft',
  'SlideOutRight',
  'SlideOutUp',
  'StretchInX',
  'StretchInY',
  'StretchOutX',
  'StretchOutY',
  'ZoomIn',
  'ZoomInDown',
  'ZoomInEasyDown',
  'ZoomInEasyUp',
  'ZoomInLeft',
  'ZoomInRight',
  'ZoomInRotate',
  'ZoomInUp',
  'ZoomOut',
  'ZoomOutDown',
  'ZoomOutEasyDown',
  'ZoomOutEasyUp',
  'ZoomOutLeft',
  'ZoomOutRight',
  'ZoomOutRotate',
  'ZoomOutUp',
]);

const LayoutTransitions = new Set([
  'Layout',
  'LinearTransition',
  'SequencedTransition',
  'FadingTransition',
  'JumpingTransition',
  'CurvedTransition',
  'EntryExitTransition',
]);

const LayoutAnimations = new Set([
  ...EntryExitAnimations,
  ...LayoutTransitions,
]);

const BaseAnimationsChainableMethods = new Set([
  'build',
  'duration',
  'delay',
  'getDuration',
  'randomDelay',
  'getDelay',
  'getDelayFunction',
]);

const ComplexAnimationsChainableMethods = new Set([
  'easing',
  'rotate',
  'springify',
  'damping',
  'mass',
  'stiffness',
  'overshootClamping',
  'restDisplacementThreshold',
  'restSpeedThreshold',
  'withInitialValues',
  'getAnimationAndConfig',
]);

const DefaultTransitionChainableMethods = new Set([
  'easingX',
  'easingY',
  'easingWidth',
  'easingHeight',
  'entering',
  'exiting',
  'reverse',
]);

const LayoutAnimationsChainableMethods = new Set([
  ...BaseAnimationsChainableMethods,
  ...ComplexAnimationsChainableMethods,
  ...DefaultTransitionChainableMethods,
]);

const LayoutAnimationsCallbacks = new Set(['withCallback']);

export function isLayoutAnimationCallback(
  path: NodePath<
    FunctionDeclaration | FunctionExpression | ArrowFunctionExpression
  >
) {
  return (
    isCallExpression(path.parent) &&
    isExpression(path.parent.callee) &&
    isLayoutAnimationCallbackMethod(path.parent.callee)
  );
}

function isLayoutAnimationCallbackMethod(exp: Expression) {
  return (
    isMemberExpression(exp) &&
    isIdentifier(exp.property) &&
    LayoutAnimationsCallbacks.has(exp.property.name) &&
    isLayoutAnimationsChainableOrNewOperator(exp.object)
  );
}

function isLayoutAnimationsChainableOrNewOperator(exp: Expression) {
  if (isIdentifier(exp) && LayoutAnimations.has(exp.name)) {
    return true;
  } else if (
    isNewExpression(exp) &&
    isIdentifier(exp.callee) &&
    LayoutAnimations.has(exp.callee.name)
  ) {
    return true;
  }
  if (
    isCallExpression(exp) &&
    isMemberExpression(exp.callee) &&
    isIdentifier(exp.callee.property) &&
    LayoutAnimationsChainableMethods.has(exp.callee.property.name) &&
    isLayoutAnimationsChainableOrNewOperator(exp.callee.object)
  ) {
    return true;
  }

  return false;
}
