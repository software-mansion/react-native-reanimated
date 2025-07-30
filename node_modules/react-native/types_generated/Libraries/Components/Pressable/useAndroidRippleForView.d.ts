/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @generated SignedSource<<ab75455eee7fd425acf00caf7b738059>>
 *
 * This file was translated from Flow by scripts/build-types/index.js.
 * Original file: packages/react-native/Libraries/Components/Pressable/useAndroidRippleForView.js
 */

import type { ColorValue } from "../../StyleSheet/StyleSheet";
import type { GestureResponderEvent } from "../../Types/CoreEventTypes";
import View from "../View/View";
import * as React from "react";
type NativeBackgroundProp = Readonly<{
  type: "RippleAndroid";
  color: number | undefined;
  borderless: boolean;
  rippleRadius: number | undefined;
}>;
export type PressableAndroidRippleConfig = {
  color?: ColorValue;
  borderless?: boolean;
  radius?: number;
  foreground?: boolean;
};
/**
 * Provides the event handlers and props for configuring the ripple effect on
 * supported versions of Android.
 */
declare function useAndroidRippleForView(rippleConfig: null | undefined | PressableAndroidRippleConfig, viewRef: {
  current: null | React.ComponentRef<typeof View>;
}): null | undefined | Readonly<{
  onPressIn: (event: GestureResponderEvent) => void;
  onPressMove: (event: GestureResponderEvent) => void;
  onPressOut: (event: GestureResponderEvent) => void;
  viewProps: Readonly<{
    nativeBackgroundAndroid: NativeBackgroundProp;
  }> | Readonly<{
    nativeForegroundAndroid: NativeBackgroundProp;
  }>;
}>;
export default useAndroidRippleForView;
