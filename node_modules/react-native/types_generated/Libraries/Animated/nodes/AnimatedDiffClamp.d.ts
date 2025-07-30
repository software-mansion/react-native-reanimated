/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @generated SignedSource<<937cda520248f4cff94c45f7660751ef>>
 *
 * This file was translated from Flow by scripts/build-types/index.js.
 * Original file: packages/react-native/Libraries/Animated/nodes/AnimatedDiffClamp.js
 */

import type { InterpolationConfigType } from "./AnimatedInterpolation";
import type AnimatedNode from "./AnimatedNode";
import type { AnimatedNodeConfig } from "./AnimatedNode";
import AnimatedInterpolation from "./AnimatedInterpolation";
import AnimatedWithChildren from "./AnimatedWithChildren";
declare class AnimatedDiffClamp extends AnimatedWithChildren {
  constructor(a: AnimatedNode, min: number, max: number, config?: null | undefined | AnimatedNodeConfig);
  interpolate<OutputT extends number | string>(config: InterpolationConfigType<OutputT>): AnimatedInterpolation<OutputT>;
}
export default AnimatedDiffClamp;
