/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @generated SignedSource<<366b2f3cad3e39abe19be04943eed4fc>>
 *
 * This file was translated from Flow by scripts/build-types/index.js.
 * Original file: packages/react-native/Libraries/Animated/AnimatedEvent.js
 */

import type { NativeSyntheticEvent } from "../Types/CoreEventTypes";
import type { PlatformConfig } from "./AnimatedPlatformConfig";
import AnimatedValue from "./nodes/AnimatedValue";
import AnimatedValueXY from "./nodes/AnimatedValueXY";
export type Mapping = {
  [key: string]: Mapping;
} | AnimatedValue | AnimatedValueXY;
export type EventConfig<T> = {
  listener?: (($$PARAM_0$$: NativeSyntheticEvent<T>) => unknown) | undefined;
  useNativeDriver: boolean;
  platformConfig?: PlatformConfig;
};
export declare function attachNativeEvent(viewRef: any, eventName: string, argMapping: ReadonlyArray<null | undefined | Mapping>, platformConfig: null | undefined | PlatformConfig): {
  detach: () => void;
};
export declare class AnimatedEvent {
  constructor(argMapping: ReadonlyArray<null | undefined | Mapping>, config: EventConfig<any>);
}
