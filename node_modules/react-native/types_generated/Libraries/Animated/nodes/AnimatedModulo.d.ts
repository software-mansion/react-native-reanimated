/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @generated SignedSource<<60c4f22efd19c158398b0acf8973ee49>>
 *
 * This file was translated from Flow by scripts/build-types/index.js.
 * Original file: packages/react-native/Libraries/Animated/nodes/AnimatedModulo.js
 */

import type { InterpolationConfigType } from "./AnimatedInterpolation";
import type AnimatedNode from "./AnimatedNode";
import type { AnimatedNodeConfig } from "./AnimatedNode";
import AnimatedInterpolation from "./AnimatedInterpolation";
import AnimatedWithChildren from "./AnimatedWithChildren";
declare class AnimatedModulo extends AnimatedWithChildren {
  constructor(a: AnimatedNode, modulus: number, config?: null | undefined | AnimatedNodeConfig);
  interpolate<OutputT extends number | string>(config: InterpolationConfigType<OutputT>): AnimatedInterpolation<OutputT>;
}
export default AnimatedModulo;
