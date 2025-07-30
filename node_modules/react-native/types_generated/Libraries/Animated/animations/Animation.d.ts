/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @generated SignedSource<<65c7a17e217c18d6ab20f92153c05150>>
 *
 * This file was translated from Flow by scripts/build-types/index.js.
 * Original file: packages/react-native/Libraries/Animated/animations/Animation.js
 */

import type { PlatformConfig } from "../AnimatedPlatformConfig";
import type AnimatedValue from "../nodes/AnimatedValue";
export type EndResult = {
  finished: boolean;
  value?: number;
  offset?: number;
};
export type EndCallback = (result: EndResult) => void;
export type AnimationConfig = Readonly<{
  isInteraction?: boolean;
  useNativeDriver: boolean;
  platformConfig?: PlatformConfig;
  onComplete?: EndCallback | undefined;
  iterations?: number;
  isLooping?: boolean;
  debugID?: string | undefined;
}>;
declare class Animation {
  constructor(config: AnimationConfig);
  start(fromValue: number, onUpdate: (value: number) => void, onEnd: null | undefined | EndCallback, previousAnimation: null | undefined | Animation, animatedValue: AnimatedValue): void;
  stop(): void;
}
export default Animation;
