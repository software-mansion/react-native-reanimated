/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @generated SignedSource<<10aca2cbf9da64ef713c98599b9e6c62>>
 *
 * This file was translated from Flow by scripts/build-types/index.js.
 * Original file: packages/react-native/Libraries/Animated/animations/TimingAnimation.js
 */

import type { RgbaValue } from "../nodes/AnimatedColor";
import type AnimatedInterpolation from "../nodes/AnimatedInterpolation";
import type AnimatedValue from "../nodes/AnimatedValue";
import type AnimatedValueXY from "../nodes/AnimatedValueXY";
import type { AnimationConfig, EndCallback } from "./Animation";
import AnimatedColor from "../nodes/AnimatedColor";
import Animation from "./Animation";
export type TimingAnimationConfig = Readonly<Omit<AnimationConfig, keyof {
  toValue: number | AnimatedValue | Readonly<{
    x: number;
    y: number;
  }> | AnimatedValueXY | RgbaValue | AnimatedColor | AnimatedInterpolation<number>;
  easing?: (value: number) => number;
  duration?: number;
  delay?: number;
}> & {
  toValue: number | AnimatedValue | Readonly<{
    x: number;
    y: number;
  }> | AnimatedValueXY | RgbaValue | AnimatedColor | AnimatedInterpolation<number>;
  easing?: (value: number) => number;
  duration?: number;
  delay?: number;
}>;
export type TimingAnimationConfigSingle = Readonly<Omit<AnimationConfig, keyof {
  toValue: number;
  easing?: (value: number) => number;
  duration?: number;
  delay?: number;
}> & {
  toValue: number;
  easing?: (value: number) => number;
  duration?: number;
  delay?: number;
}>;
declare class TimingAnimation extends Animation {
  constructor(config: TimingAnimationConfigSingle);
  start(fromValue: number, onUpdate: (value: number) => void, onEnd: null | undefined | EndCallback, previousAnimation: null | undefined | Animation, animatedValue: AnimatedValue): void;
  onUpdate(): void;
  stop(): void;
}
export default TimingAnimation;
