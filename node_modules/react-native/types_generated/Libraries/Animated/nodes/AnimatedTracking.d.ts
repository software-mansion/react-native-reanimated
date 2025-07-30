/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @generated SignedSource<<eb00b2447fd5839d442130069c870bb3>>
 *
 * This file was translated from Flow by scripts/build-types/index.js.
 * Original file: packages/react-native/Libraries/Animated/nodes/AnimatedTracking.js
 */

import type { EndCallback } from "../animations/Animation";
import type { AnimatedNodeConfig } from "./AnimatedNode";
import type AnimatedValue from "./AnimatedValue";
import AnimatedNode from "./AnimatedNode";
declare class AnimatedTracking extends AnimatedNode {
  constructor(value: AnimatedValue, parent: AnimatedNode, animationClass: any, animationConfig: Object, callback?: null | undefined | EndCallback, config?: null | undefined | AnimatedNodeConfig);
  update(): void;
}
export default AnimatedTracking;
