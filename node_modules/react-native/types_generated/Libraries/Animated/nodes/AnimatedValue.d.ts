/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @generated SignedSource<<b176cb5a5d9aa91bdd7d45ed40f91b3f>>
 *
 * This file was translated from Flow by scripts/build-types/index.js.
 * Original file: packages/react-native/Libraries/Animated/nodes/AnimatedValue.js
 */

import type Animation from "../animations/Animation";
import type { EndCallback } from "../animations/Animation";
import type { InterpolationConfigType } from "./AnimatedInterpolation";
import type AnimatedNode from "./AnimatedNode";
import type { AnimatedNodeConfig } from "./AnimatedNode";
import type AnimatedTracking from "./AnimatedTracking";
import AnimatedInterpolation from "./AnimatedInterpolation";
import AnimatedWithChildren from "./AnimatedWithChildren";
export type AnimatedValueConfig = Readonly<Omit<AnimatedNodeConfig, keyof {
  useNativeDriver: boolean;
}> & {
  useNativeDriver: boolean;
}>;
/**
 * Animated works by building a directed acyclic graph of dependencies
 * transparently when you render your Animated components.
 *
 *               new Animated.Value(0)
 *     .interpolate()        .interpolate()    new Animated.Value(1)
 *         opacity               translateY      scale
 *          style                         transform
 *         View#234                         style
 *                                         View#123
 *
 * A) Top Down phase
 * When an Animated.Value is updated, we recursively go down through this
 * graph in order to find leaf nodes: the views that we flag as needing
 * an update.
 *
 * B) Bottom Up phase
 * When a view is flagged as needing an update, we recursively go back up
 * in order to build the new value that it needs. The reason why we need
 * this two-phases process is to deal with composite props such as
 * transform which can receive values from multiple parents.
 */
export declare function flushValue(rootNode: AnimatedNode): void;
/**
 * Standard value for driving animations.  One `Animated.Value` can drive
 * multiple properties in a synchronized fashion, but can only be driven by one
 * mechanism at a time.  Using a new mechanism (e.g. starting a new animation,
 * or calling `setValue`) will stop any previous ones.
 *
 * See https://reactnative.dev/docs/animatedvalue
 */
declare class AnimatedValue extends AnimatedWithChildren {
  constructor(value: number, config?: null | undefined | AnimatedValueConfig);
  addListener(callback: (value: any) => unknown): string;
  removeListener(id: string): void;
  removeAllListeners(): void;
  setValue(value: number): void;
  setOffset(offset: number): void;
  flattenOffset(): void;
  extractOffset(): void;
  stopAnimation(callback?: null | undefined | ((value: number) => void)): void;
  resetAnimation(callback?: null | undefined | ((value: number) => void)): void;
  interpolate<OutputT extends number | string>(config: InterpolationConfigType<OutputT>): AnimatedInterpolation<OutputT>;
  animate(animation: Animation, callback: null | undefined | EndCallback): void;
  stopTracking(): void;
  track(tracking: AnimatedTracking): void;
}
export default AnimatedValue;
