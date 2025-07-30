/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @generated SignedSource<<7469d665fff3c63e3979a77b8a9e6dc0>>
 *
 * This file was translated from Flow by scripts/build-types/index.js.
 * Original file: packages/react-native/Libraries/Animated/nodes/AnimatedStyle.js
 */

import type { AnimatedNodeConfig } from "./AnimatedNode";
import AnimatedNode from "./AnimatedNode";
import AnimatedWithChildren from "./AnimatedWithChildren";
export type AnimatedStyleAllowlist = Readonly<{
  [$$Key$$: string]: true;
}>;
declare class AnimatedStyle extends AnimatedWithChildren {
  static from(inputStyle: any, allowlist: null | undefined | AnimatedStyleAllowlist): null | undefined | AnimatedStyle;
  constructor(nodeKeys: ReadonlyArray<string>, nodes: ReadonlyArray<AnimatedNode>, style: {
    [$$Key$$: string]: unknown;
  }, inputStyle: any, config?: null | undefined | AnimatedNodeConfig);
}
export default AnimatedStyle;
