/* global _WORKLET _measure _scrollTo _setGestureState */
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import { Component } from 'react';
import { findNodeHandle } from 'react-native';
import { RefObjectFunction } from './hook/useAnimatedRef';
import { isChromeDebugger } from './PlatformChecker';

export function getTag(
  view: null | number | React.Component<any, any> | React.ComponentClass<any>
): null | number {
  return findNodeHandle(view);
}

export interface MeasuredDimensions {
  x: number;
  y: number;
  width: number;
  height: number;
  pageX: number;
  pageY: number;
}

export function measure(
  animatedRef: RefObjectFunction<Component>
): MeasuredDimensions {
  'worklet';
  if (!_WORKLET && !isChromeDebugger()) {
    throw new Error('(measure) method cannot be used on RN side!');
  }
  const viewTag = animatedRef();
  const result = _measure(viewTag);
  if (result.x === -1234567) {
    throw new Error(`The view with tag ${viewTag} could not be measured`);
  }
  return result;
}

export function scrollTo(
  animatedRef: RefObjectFunction<Component>,
  x: number,
  y: number,
  animated: boolean
): void {
  'worklet';
  if (!_WORKLET && !isChromeDebugger()) {
    return;
  }
  const viewTag = animatedRef();
  _scrollTo(viewTag, x, y, animated);
}

export function setGestureState(handlerTag: number, newState: number): void {
  'worklet';
  if (!_WORKLET && !isChromeDebugger()) {
    console.warn(
      '[Reanimated] You can not use setGestureState in non-worklet function.'
    );
  }
  _setGestureState(handlerTag, newState);
}
