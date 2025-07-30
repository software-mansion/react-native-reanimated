/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @generated SignedSource<<b2395c936593760f5fe6a568f9fddf44>>
 *
 * This file was translated from Flow by scripts/build-types/index.js.
 * Original file: packages/react-native/Libraries/Text/TextNativeComponent.js
 */

import type { HostComponent } from "../../src/private/types/HostComponent";
import type { ProcessedColorValue } from "../StyleSheet/processColor";
import type { GestureResponderEvent } from "../Types/CoreEventTypes";
import type { TextProps } from "./TextProps";
export type NativeTextProps = Readonly<Omit<TextProps, keyof {
  isHighlighted?: boolean | undefined;
  selectionColor?: ProcessedColorValue | undefined;
  onClick?: ((event: GestureResponderEvent) => unknown) | undefined;
  isPressable?: boolean | undefined;
}> & {
  isHighlighted?: boolean | undefined;
  selectionColor?: ProcessedColorValue | undefined;
  onClick?: ((event: GestureResponderEvent) => unknown) | undefined;
  isPressable?: boolean | undefined;
}>;
export declare const NativeText: HostComponent<NativeTextProps>;
export declare type NativeText = typeof NativeText;
export declare const NativeVirtualText: HostComponent<NativeTextProps>;
export declare type NativeVirtualText = typeof NativeVirtualText;
