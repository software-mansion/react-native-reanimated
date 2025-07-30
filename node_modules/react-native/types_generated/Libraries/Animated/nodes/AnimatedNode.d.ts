/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @generated SignedSource<<62b2009c24e82e8e234bfa293b0582c5>>
 *
 * This file was translated from Flow by scripts/build-types/index.js.
 * Original file: packages/react-native/Libraries/Animated/nodes/AnimatedNode.js
 */

export type AnimatedNodeConfig = Readonly<{
  debugID?: string;
}>;
declare class AnimatedNode {
  constructor(config?: null | undefined | Readonly<Omit<AnimatedNodeConfig, keyof {}> & {}>);
  addListener(callback: (value: any) => unknown): string;
  removeListener(id: string): void;
  removeAllListeners(): void;
  hasListeners(): boolean;
  toJSON(): unknown;
}
export default AnimatedNode;
