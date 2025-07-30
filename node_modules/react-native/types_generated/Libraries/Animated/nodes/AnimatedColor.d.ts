/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @generated SignedSource<<c60169baaccc65fa9e0361ecc3a10b71>>
 *
 * This file was translated from Flow by scripts/build-types/index.js.
 * Original file: packages/react-native/Libraries/Animated/nodes/AnimatedColor.js
 */

import type { ColorValue } from "../../StyleSheet/StyleSheet";
import type { NativeColorValue } from "../../StyleSheet/StyleSheetTypes";
import type { AnimatedNodeConfig } from "./AnimatedNode";
import AnimatedValue from "./AnimatedValue";
import AnimatedWithChildren from "./AnimatedWithChildren";
export type AnimatedColorConfig = Readonly<Omit<AnimatedNodeConfig, keyof {
  useNativeDriver: boolean;
}> & {
  useNativeDriver: boolean;
}>;
type ColorListenerCallback = (value: ColorValue) => unknown;
export type RgbaValue = {
  readonly r: number;
  readonly g: number;
  readonly b: number;
  readonly a: number;
};
type RgbaAnimatedValue = {
  readonly r: AnimatedValue;
  readonly g: AnimatedValue;
  readonly b: AnimatedValue;
  readonly a: AnimatedValue;
};
export type InputValue = null | undefined | (RgbaValue | RgbaAnimatedValue | ColorValue);
declare class AnimatedColor extends AnimatedWithChildren {
  r: AnimatedValue;
  g: AnimatedValue;
  b: AnimatedValue;
  a: AnimatedValue;
  nativeColor: null | undefined | NativeColorValue;
  constructor(valueIn?: InputValue, config?: null | undefined | AnimatedColorConfig);
  setValue(value: RgbaValue | ColorValue): void;
  setOffset(offset: RgbaValue): void;
  flattenOffset(): void;
  extractOffset(): void;
  stopAnimation(callback?: ColorListenerCallback): void;
  resetAnimation(callback?: ColorListenerCallback): void;
}
export default AnimatedColor;
