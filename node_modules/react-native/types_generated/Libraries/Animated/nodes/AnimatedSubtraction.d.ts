/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @generated SignedSource<<ea8803546db5697651bbf917da70115c>>
 *
 * This file was translated from Flow by scripts/build-types/index.js.
 * Original file: packages/react-native/Libraries/Animated/nodes/AnimatedSubtraction.js
 */

import type { InterpolationConfigType } from "./AnimatedInterpolation";
import type AnimatedNode from "./AnimatedNode";
import type { AnimatedNodeConfig } from "./AnimatedNode";
import AnimatedInterpolation from "./AnimatedInterpolation";
import AnimatedWithChildren from "./AnimatedWithChildren";
declare class AnimatedSubtraction extends AnimatedWithChildren {
  constructor(a: AnimatedNode | number, b: AnimatedNode | number, config?: null | undefined | AnimatedNodeConfig);
  interpolate<OutputT extends number | string>(config: InterpolationConfigType<OutputT>): AnimatedInterpolation<OutputT>;
}
export default AnimatedSubtraction;
