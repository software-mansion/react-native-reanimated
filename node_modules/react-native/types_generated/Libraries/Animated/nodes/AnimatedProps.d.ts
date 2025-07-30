/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @generated SignedSource<<fbb08335c0ecc21da5a2c9de6337be8c>>
 *
 * This file was translated from Flow by scripts/build-types/index.js.
 * Original file: packages/react-native/Libraries/Animated/nodes/AnimatedProps.js
 */

import * as React from "react";
import type { AnimatedNodeConfig } from "./AnimatedNode";
import type { AnimatedStyleAllowlist } from "./AnimatedStyle";
import AnimatedNode from "./AnimatedNode";
export type AnimatedPropsAllowlist = Readonly<{
  style?: AnimatedStyleAllowlist | undefined;
  [key: string]: true | AnimatedStyleAllowlist;
}>;
type TargetViewInstance = React.ComponentRef<React.ElementType>;
declare class AnimatedProps extends AnimatedNode {
  constructor(inputProps: {
    [$$Key$$: string]: unknown;
  }, callback: () => void, allowlist?: null | undefined | AnimatedPropsAllowlist, config?: null | undefined | AnimatedNodeConfig);
  update(): void;
  setNativeView(instance: TargetViewInstance): void;
}
export default AnimatedProps;
