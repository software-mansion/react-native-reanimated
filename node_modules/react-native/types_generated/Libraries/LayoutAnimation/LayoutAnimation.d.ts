/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @generated SignedSource<<9e21fd8face44a067ae6750c6e6cc438>>
 *
 * This file was translated from Flow by scripts/build-types/index.js.
 * Original file: packages/react-native/Libraries/LayoutAnimation/LayoutAnimation.js
 */

import type { LayoutAnimationConfig as LayoutAnimationConfig_, LayoutAnimationProperty, LayoutAnimationType } from "../Renderer/shims/ReactNativeTypes";
export type { LayoutAnimationType, LayoutAnimationProperty, LayoutAnimationAnimationConfig as LayoutAnimationAnim } from "../Renderer/shims/ReactNativeTypes";
export type LayoutAnimationConfig = LayoutAnimationConfig_;
export type LayoutAnimationTypes = Readonly<{ [type in LayoutAnimationType]: type }>;
export type LayoutAnimationProperties = Readonly<{ [prop in LayoutAnimationProperty]: prop }>;
type OnAnimationDidEndCallback = () => void;
type OnAnimationDidFailCallback = () => void;
declare function setEnabled(value: boolean): void;
/**
 * Configures the next commit to be animated.
 *
 * onAnimationDidEnd is guaranteed to be called when the animation completes.
 * onAnimationDidFail is *never* called in the classic, pre-Fabric renderer,
 * and never has been. In the new renderer (Fabric) it is called only if configuration
 * parsing fails.
 */
declare function configureNext(config: LayoutAnimationConfig, onAnimationDidEnd?: OnAnimationDidEndCallback, onAnimationDidFail?: OnAnimationDidFailCallback): void;
declare function create(duration: number, type?: LayoutAnimationType, property?: LayoutAnimationProperty): LayoutAnimationConfig;
declare const Presets: {
  easeInEaseOut: LayoutAnimationConfig;
  linear: LayoutAnimationConfig;
  spring: LayoutAnimationConfig;
};
declare const LayoutAnimation: {
  /**
   * Schedules an animation to happen on the next layout.
   *
   * @param config Specifies animation properties:
   *
   *   - `duration` in milliseconds
   *   - `create`, `AnimationConfig` for animating in new views
   *   - `update`, `AnimationConfig` for animating views that have been updated
   *
   * @param onAnimationDidEnd Called when the animation finished.
   * Only supported on iOS.
   * @param onError Called on error. Only supported on iOS.
   */
  configureNext: typeof configureNext;
  /**
   * Helper for creating a config for `configureNext`.
   */
  create: typeof create;
  Types: LayoutAnimationTypes;
  Properties: LayoutAnimationProperties;
  checkConfig(...args: Array<unknown>): void;
  Presets: typeof Presets;
  easeInEaseOut: (onAnimationDidEnd?: OnAnimationDidEndCallback) => void;
  linear: (onAnimationDidEnd?: OnAnimationDidEndCallback) => void;
  spring: (onAnimationDidEnd?: OnAnimationDidEndCallback) => void;
  setEnabled: typeof setEnabled;
};
/**
 * Automatically animates views to their new positions when the
 * next layout happens.
 *
 * A common way to use this API is to call it before calling `setState`.
 *
 * Note that in order to get this to work on **Android** you need to set the following flags via `UIManager`:
 *
 *     UIManager.setLayoutAnimationEnabledExperimental && UIManager.setLayoutAnimationEnabledExperimental(true);
 */
declare const $$LayoutAnimation: typeof LayoutAnimation;
declare type $$LayoutAnimation = typeof $$LayoutAnimation;
export default $$LayoutAnimation;
