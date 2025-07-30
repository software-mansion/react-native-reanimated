/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @generated SignedSource<<ebaa05f2542a5adbb79ed16412e38dfd>>
 *
 * This file was translated from Flow by scripts/build-types/index.js.
 * Original file: packages/react-native/Libraries/Components/Pressable/Pressable.js
 */

import type { GestureResponderEvent, LayoutChangeEvent, MouseEvent } from "../../Types/CoreEventTypes";
import type { ViewProps } from "../View/ViewPropTypes";
import { type RectOrSize } from "../../StyleSheet/Rect";
import View from "../View/View";
import { type PressableAndroidRippleConfig } from "./useAndroidRippleForView";
import * as React from "react";
type ViewStyleProp = React.JSX.LibraryManagedAttributes<typeof View, React.ComponentProps<typeof View>>["style"];
export type { PressableAndroidRippleConfig };
export type PressableStateCallbackType = Readonly<{
  pressed: boolean;
}>;
type PressableBaseProps = Readonly<{
  /**
   * Whether a press gesture can be interrupted by a parent gesture such as a
   * scroll event. Defaults to true.
   */
  cancelable?: boolean | undefined;
  /**
   * Either children or a render prop that receives a boolean reflecting whether
   * the component is currently pressed.
   */
  children?: React.ReactNode | ((state: PressableStateCallbackType) => React.ReactNode);
  /**
   * Duration to wait after hover in before calling `onHoverIn`.
   */
  delayHoverIn?: number | undefined;
  /**
   * Duration to wait after hover out before calling `onHoverOut`.
   */
  delayHoverOut?: number | undefined;
  /**
   * Duration (in milliseconds) from `onPressIn` before `onLongPress` is called.
   */
  delayLongPress?: number | undefined;
  /**
   * Whether the press behavior is disabled.
   */
  disabled?: boolean | undefined;
  /**
   * Additional distance outside of this view in which a press is detected.
   */
  hitSlop?: RectOrSize | undefined;
  /**
   * Additional distance outside of this view in which a touch is considered a
   * press before `onPressOut` is triggered.
   */
  pressRetentionOffset?: RectOrSize | undefined;
  /**
   * Called when this view's layout changes.
   */
  onLayout?: ((event: LayoutChangeEvent) => unknown) | undefined;
  /**
   * Called when the hover is activated to provide visual feedback.
   */
  onHoverIn?: ((event: MouseEvent) => unknown) | undefined;
  /**
   * Called when the hover is deactivated to undo visual feedback.
   */
  onHoverOut?: ((event: MouseEvent) => unknown) | undefined;
  /**
   * Called when a long-tap gesture is detected.
   */
  onLongPress?: ((event: GestureResponderEvent) => unknown) | undefined;
  /**
   * Called when a single tap gesture is detected.
   */
  onPress?: ((event: GestureResponderEvent) => unknown) | undefined;
  /**
   * Called when a touch is engaged before `onPress`.
   */
  onPressIn?: ((event: GestureResponderEvent) => unknown) | undefined;
  /**
   * Called when the press location moves.
   */
  onPressMove?: ((event: GestureResponderEvent) => unknown) | undefined;
  /**
   * Called when a touch is released before `onPress`.
   */
  onPressOut?: ((event: GestureResponderEvent) => unknown) | undefined;
  /**
   * Either view styles or a function that receives a boolean reflecting whether
   * the component is currently pressed and returns view styles.
   */
  style?: ViewStyleProp | ((state: PressableStateCallbackType) => ViewStyleProp);
  /**
   * Identifier used to find this view in tests.
   */
  testID?: string | undefined;
  /**
   * If true, doesn't play system sound on touch.
   */
  android_disableSound?: boolean | undefined;
  /**
   * Enables the Android ripple effect and configures its color.
   */
  android_ripple?: PressableAndroidRippleConfig | undefined;
  /**
   * Used only for documentation or testing (e.g. snapshot testing).
   */
  testOnly_pressed?: boolean | undefined;
  /**
   * Duration to wait after press down before calling `onPressIn`.
   */
  unstable_pressDelay?: number | undefined;
}>;
export type PressableProps = Readonly<Omit<Omit<ViewProps, "onMouseEnter" | "onMouseLeave">, keyof PressableBaseProps | keyof {}> & Omit<PressableBaseProps, keyof {}> & {}>;
declare const $$Pressable: (props: Omit<PressableProps, keyof {
  ref?: React.Ref<React.ComponentRef<typeof View>>;
}> & {
  ref?: React.Ref<React.ComponentRef<typeof View>>;
}) => React.ReactNode;
declare type $$Pressable = typeof $$Pressable;
export default $$Pressable;
