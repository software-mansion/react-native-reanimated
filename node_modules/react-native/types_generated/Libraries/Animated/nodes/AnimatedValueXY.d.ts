/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @generated SignedSource<<4223ab0c81b4d4655a27306a7189621e>>
 *
 * This file was translated from Flow by scripts/build-types/index.js.
 * Original file: packages/react-native/Libraries/Animated/nodes/AnimatedValueXY.js
 */

import type { AnimatedNodeConfig } from "./AnimatedNode";
import AnimatedValue from "./AnimatedValue";
import AnimatedWithChildren from "./AnimatedWithChildren";
export type AnimatedValueXYConfig = Readonly<Omit<AnimatedNodeConfig, keyof {
  useNativeDriver: boolean;
}> & {
  useNativeDriver: boolean;
}>;
type ValueXYListenerCallback = (value: {
  x: number;
  y: number;
}) => unknown;
/**
 * 2D Value for driving 2D animations, such as pan gestures. Almost identical
 * API to normal `Animated.Value`, but multiplexed.
 *
 * See https://reactnative.dev/docs/animatedvaluexy
 */
declare class AnimatedValueXY extends AnimatedWithChildren {
  x: AnimatedValue;
  y: AnimatedValue;
  constructor(valueIn?: null | undefined | {
    readonly x: number | AnimatedValue;
    readonly y: number | AnimatedValue;
  }, config?: null | undefined | AnimatedValueXYConfig);
  setValue(value: {
    x: number;
    y: number;
  }): void;
  setOffset(offset: {
    x: number;
    y: number;
  }): void;
  flattenOffset(): void;
  extractOffset(): void;
  resetAnimation(callback?: (value: {
    x: number;
    y: number;
  }) => void): void;
  stopAnimation(callback?: (value: {
    x: number;
    y: number;
  }) => void): void;
  addListener(callback: ValueXYListenerCallback): string;
  removeListener(id: string): void;
  removeAllListeners(): void;
  getLayout(): {
    [key: string]: AnimatedValue;
  };
  getTranslateTransform(): Array<{
    translateX: AnimatedValue;
  } | {
    translateY: AnimatedValue;
  }>;
}
export default AnimatedValueXY;
