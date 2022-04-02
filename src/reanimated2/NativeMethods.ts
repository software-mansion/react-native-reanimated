/* global _WORKLET _measure _dispatchCommand _setGestureState */
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import { Component } from 'react';
import { RefObjectFunction } from './commonTypes';
import { shouldBeUseWeb } from './PlatformChecker';

export interface MeasuredDimensions {
  x: number;
  y: number;
  width: number;
  height: number;
  pageX: number;
  pageY: number;
}

const isNativeIndefined = shouldBeUseWeb();

export function measure(
  animatedRef: RefObjectFunction<Component>
): MeasuredDimensions {
  'worklet';
  if (!_WORKLET || isNativeIndefined) {
    console.warn(
      '[reanimated.measure] method cannot be used for web or Chrome Debugger'
    );
    return {
      x: NaN,
      y: NaN,
      width: NaN,
      height: NaN,
      pageX: NaN,
      pageY: NaN,
    };
  }
  const viewTag = animatedRef();
  const result = _measure(viewTag);
  if (result.x === -1234567) {
    throw new Error(`The view with tag ${viewTag} could not be measured`);
  }
  return result;
}

export function dispatchCommand(
  animatedRef: RefObjectFunction<Component>,
  commandName: string,
  args: Array<unknown>
): void {
  'worklet';
  if (!_WORKLET || isNativeIndefined) {
    return;
  }
  const shadowNodeWrapper = animatedRef();
  _dispatchCommand(shadowNodeWrapper, commandName, args);
}

export function scrollTo(
  animatedRef: RefObjectFunction<Component>,
  x: number,
  y: number,
  animated: boolean
): void {
  'worklet';
  dispatchCommand(animatedRef, 'scrollTo', [x, y, animated]);
}

export function setGestureState(handlerTag: number, newState: number): void {
  'worklet';
  if (!_WORKLET || isNativeIndefined) {
    console.warn(
      '[Reanimated] You can not use setGestureState in non-worklet function.'
    );
    return;
  }
  _setGestureState(handlerTag, newState);
}
