/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @generated SignedSource<<b7e3c9a56f00756e733a269fa871e7c3>>
 *
 * This file was translated from Flow by scripts/build-types/index.js.
 * Original file: packages/react-native/Libraries/Components/View/ViewPropTypes.js
 */

import type { EdgeInsetsOrSizeProp } from "../../StyleSheet/EdgeInsetsPropType";
import type { ViewStyleProp } from "../../StyleSheet/StyleSheet";
import type { BlurEvent, FocusEvent, GestureResponderEvent, LayoutChangeEvent, LayoutRectangle, MouseEvent, PointerEvent } from "../../Types/CoreEventTypes";
import type { AccessibilityActionEvent, AccessibilityProps } from "./ViewAccessibility";
import * as React from "react";
export type ViewLayout = LayoutRectangle;
export type ViewLayoutEvent = LayoutChangeEvent;
type DirectEventProps = Readonly<{
  /**
   * When `accessible` is true, the system will try to invoke this function
   * when the user performs an accessibility custom action.
   *
   */
  onAccessibilityAction?: ((event: AccessibilityActionEvent) => unknown) | undefined;
  /**
   * When `accessible` is true, the system will try to invoke this function
   * when the user performs accessibility tap gesture.
   *
   * See https://reactnative.dev/docs/view#onaccessibilitytap
   */
  onAccessibilityTap?: (() => unknown) | undefined;
  /**
   * Invoked on mount and layout changes with:
   *
   * `{nativeEvent: { layout: {x, y, width, height}}}`
   *
   * This event is fired immediately once the layout has been calculated, but
   * the new layout may not yet be reflected on the screen at the time the
   * event is received, especially if a layout animation is in progress.
   *
   * See https://reactnative.dev/docs/view#onlayout
   */
  onLayout?: ((event: LayoutChangeEvent) => unknown) | undefined;
  /**
   * When `accessible` is `true`, the system will invoke this function when the
   * user performs the magic tap gesture.
   *
   * See https://reactnative.dev/docs/view#onmagictap
   */
  onMagicTap?: (() => unknown) | undefined;
  /**
   * When `accessible` is `true`, the system will invoke this function when the
   * user performs the escape gesture.
   *
   * See https://reactnative.dev/docs/view#onaccessibilityescape
   */
  onAccessibilityEscape?: (() => unknown) | undefined;
}>;
type MouseEventProps = Readonly<{
  onMouseEnter?: ((event: MouseEvent) => void) | undefined;
  onMouseLeave?: ((event: MouseEvent) => void) | undefined;
}>;
type PointerEventProps = Readonly<{
  onClick?: ((event: PointerEvent) => void) | undefined;
  onClickCapture?: ((event: PointerEvent) => void) | undefined;
  onPointerEnter?: ((event: PointerEvent) => void) | undefined;
  onPointerEnterCapture?: ((event: PointerEvent) => void) | undefined;
  onPointerLeave?: ((event: PointerEvent) => void) | undefined;
  onPointerLeaveCapture?: ((event: PointerEvent) => void) | undefined;
  onPointerMove?: ((event: PointerEvent) => void) | undefined;
  onPointerMoveCapture?: ((event: PointerEvent) => void) | undefined;
  onPointerCancel?: ((e: PointerEvent) => void) | undefined;
  onPointerCancelCapture?: ((e: PointerEvent) => void) | undefined;
  onPointerDown?: ((e: PointerEvent) => void) | undefined;
  onPointerDownCapture?: ((e: PointerEvent) => void) | undefined;
  onPointerUp?: ((e: PointerEvent) => void) | undefined;
  onPointerUpCapture?: ((e: PointerEvent) => void) | undefined;
  onPointerOver?: ((e: PointerEvent) => void) | undefined;
  onPointerOverCapture?: ((e: PointerEvent) => void) | undefined;
  onPointerOut?: ((e: PointerEvent) => void) | undefined;
  onPointerOutCapture?: ((e: PointerEvent) => void) | undefined;
  onGotPointerCapture?: ((e: PointerEvent) => void) | undefined;
  onGotPointerCaptureCapture?: ((e: PointerEvent) => void) | undefined;
  onLostPointerCapture?: ((e: PointerEvent) => void) | undefined;
  onLostPointerCaptureCapture?: ((e: PointerEvent) => void) | undefined;
}>;
type FocusEventProps = Readonly<{
  onBlur?: ((event: BlurEvent) => void) | undefined;
  onBlurCapture?: ((event: BlurEvent) => void) | undefined;
  onFocus?: ((event: FocusEvent) => void) | undefined;
  onFocusCapture?: ((event: FocusEvent) => void) | undefined;
}>;
type TouchEventProps = Readonly<{
  onTouchCancel?: ((e: GestureResponderEvent) => void) | undefined;
  onTouchCancelCapture?: ((e: GestureResponderEvent) => void) | undefined;
  onTouchEnd?: ((e: GestureResponderEvent) => void) | undefined;
  onTouchEndCapture?: ((e: GestureResponderEvent) => void) | undefined;
  onTouchMove?: ((e: GestureResponderEvent) => void) | undefined;
  onTouchMoveCapture?: ((e: GestureResponderEvent) => void) | undefined;
  onTouchStart?: ((e: GestureResponderEvent) => void) | undefined;
  onTouchStartCapture?: ((e: GestureResponderEvent) => void) | undefined;
}>;
/**
 * For most touch interactions, you'll simply want to wrap your component in
 * `TouchableHighlight` or `TouchableOpacity`. Check out `Touchable.js`,
 * `ScrollResponder.js` and `ResponderEventPlugin.js` for more discussion.
 */
export type GestureResponderHandlers = Readonly<{
  /**
   * Does this view want to "claim" touch responsiveness? This is called for
   * every touch move on the `View` when it is not the responder.
   *
   * `View.props.onMoveShouldSetResponder: (event) => [true | false]`, where
   * `event` is a synthetic touch event as described above.
   *
   * See https://reactnative.dev/docs/view#onmoveshouldsetresponder
   */
  onMoveShouldSetResponder?: ((e: GestureResponderEvent) => boolean) | undefined;
  /**
   * If a parent `View` wants to prevent a child `View` from becoming responder
   * on a move, it should have this handler which returns `true`.
   *
   * `View.props.onMoveShouldSetResponderCapture: (event) => [true | false]`,
   * where `event` is a synthetic touch event as described above.
   *
   * See https://reactnative.dev/docs/view#onMoveShouldsetrespondercapture
   */
  onMoveShouldSetResponderCapture?: ((e: GestureResponderEvent) => boolean) | undefined;
  /**
   * The View is now responding for touch events. This is the time to highlight
   * and show the user what is happening.
   *
   * `View.props.onResponderGrant: (event) => {}`, where `event` is a synthetic
   * touch event as described above.
   *
   * Return true from this callback to prevent any other native components from
   * becoming responder until this responder terminates (Android-only).
   *
   * See https://reactnative.dev/docs/view#onrespondergrant
   */
  onResponderGrant?: ((e: GestureResponderEvent) => void | boolean) | undefined;
  /**
   * The user is moving their finger.
   *
   * `View.props.onResponderMove: (event) => {}`, where `event` is a synthetic
   * touch event as described above.
   *
   * See https://reactnative.dev/docs/view#onrespondermove
   */
  onResponderMove?: ((e: GestureResponderEvent) => void) | undefined;
  /**
   * Another responder is already active and will not release it to that `View`
   * asking to be the responder.
   *
   * `View.props.onResponderReject: (event) => {}`, where `event` is a
   * synthetic touch event as described above.
   *
   * See https://reactnative.dev/docs/view#onresponderreject
   */
  onResponderReject?: ((e: GestureResponderEvent) => void) | undefined;
  /**
   * Fired at the end of the touch.
   *
   * `View.props.onResponderRelease: (event) => {}`, where `event` is a
   * synthetic touch event as described above.
   *
   * See https://reactnative.dev/docs/view#onresponderrelease
   */
  onResponderRelease?: ((e: GestureResponderEvent) => void) | undefined;
  onResponderStart?: ((e: GestureResponderEvent) => void) | undefined;
  onResponderEnd?: ((e: GestureResponderEvent) => void) | undefined;
  /**
   * The responder has been taken from the `View`. Might be taken by other
   * views after a call to `onResponderTerminationRequest`, or might be taken
   * by the OS without asking (e.g., happens with control center/ notification
   * center on iOS)
   *
   * `View.props.onResponderTerminate: (event) => {}`, where `event` is a
   * synthetic touch event as described above.
   *
   * See https://reactnative.dev/docs/view#onresponderterminate
   */
  onResponderTerminate?: ((e: GestureResponderEvent) => void) | undefined;
  /**
   * Some other `View` wants to become responder and is asking this `View` to
   * release its responder. Returning `true` allows its release.
   *
   * `View.props.onResponderTerminationRequest: (event) => {}`, where `event`
   * is a synthetic touch event as described above.
   *
   * See https://reactnative.dev/docs/view#onresponderterminationrequest
   */
  onResponderTerminationRequest?: ((e: GestureResponderEvent) => boolean) | undefined;
  /**
   * Does this view want to become responder on the start of a touch?
   *
   * `View.props.onStartShouldSetResponder: (event) => [true | false]`, where
   * `event` is a synthetic touch event as described above.
   *
   * See https://reactnative.dev/docs/view#onstartshouldsetresponder
   */
  onStartShouldSetResponder?: ((e: GestureResponderEvent) => boolean) | undefined;
  /**
   * If a parent `View` wants to prevent a child `View` from becoming responder
   * on a touch start, it should have this handler which returns `true`.
   *
   * `View.props.onStartShouldSetResponderCapture: (event) => [true | false]`,
   * where `event` is a synthetic touch event as described above.
   *
   * See https://reactnative.dev/docs/view#onstartshouldsetrespondercapture
   */
  onStartShouldSetResponderCapture?: ((e: GestureResponderEvent) => boolean) | undefined;
}>;
type AndroidDrawableThemeAttr = Readonly<{
  type: "ThemeAttrAndroid";
  attribute: string;
}>;
type AndroidDrawableRipple = Readonly<{
  type: "RippleAndroid";
  color?: number | undefined;
  borderless?: boolean | undefined;
  rippleRadius?: number | undefined;
}>;
type AndroidDrawable = AndroidDrawableThemeAttr | AndroidDrawableRipple;
export type ViewPropsAndroid = Readonly<{
  nativeBackgroundAndroid?: AndroidDrawable | undefined;
  nativeForegroundAndroid?: AndroidDrawable | undefined;
  /**
   * Whether this `View` should render itself (and all of its children) into a
   * single hardware texture on the GPU.
   *
   * @platform android
   *
   * See https://reactnative.dev/docs/view#rendertohardwaretextureandroid
   */
  renderToHardwareTextureAndroid?: boolean | undefined;
  /**
   * Whether to force the Android TV focus engine to move focus to this view.
   *
   * @platform android
   */
  hasTVPreferredFocus?: boolean | undefined;
  /**
   * TV next focus down (see documentation for the View component).
   *
   * @platform android
   */
  nextFocusDown?: number | undefined;
  /**
   * TV next focus forward (see documentation for the View component).
   *
   * @platform android
   */
  nextFocusForward?: number | undefined;
  /**
   * TV next focus left (see documentation for the View component).
   *
   * @platform android
   */
  nextFocusLeft?: number | undefined;
  /**
   * TV next focus right (see documentation for the View component).
   *
   * @platform android
   */
  nextFocusRight?: number | undefined;
  /**
   * TV next focus up (see documentation for the View component).
   *
   * @platform android
   */
  nextFocusUp?: number | undefined;
  /**
   * Whether this `View` should be focusable with a non-touch input device, eg. receive focus with a hardware keyboard.
   *
   * @platform android
   */
  focusable?: boolean | undefined;
  /**
   * Indicates whether this `View` should be focusable with a non-touch input device, eg. receive focus with a hardware keyboard.
   * See https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/tabindex
   * for more details.
   *
   * Supports the following values:
   * -  0 (View is focusable)
   * - -1 (View is not focusable)
   *
   * @platform android
   */
  tabIndex?: 0 | -1;
  /**
   * The action to perform when this `View` is clicked on by a non-touch click, eg. enter key on a hardware keyboard.
   *
   * @platform android
   */
  onClick?: ((event: GestureResponderEvent) => unknown) | undefined;
}>;
export type TVViewPropsIOS = Readonly<{
  /**
   * *(Apple TV only)* When set to true, this view will be focusable
   * and navigable using the Apple TV remote.
   *
   * @platform ios
   */
  isTVSelectable?: boolean;
  /**
   * *(Apple TV only)* May be set to true to force the Apple TV focus engine to move focus to this view.
   *
   * @platform ios
   */
  hasTVPreferredFocus?: boolean;
  /**
   * *(Apple TV only)* May be used to change the appearance of the Apple TV parallax effect when this view goes in or out of focus.  Defaults to 2.0.
   *
   * @platform ios
   */
  tvParallaxShiftDistanceX?: number;
  /**
   * *(Apple TV only)* May be used to change the appearance of the Apple TV parallax effect when this view goes in or out of focus.  Defaults to 2.0.
   *
   * @platform ios
   */
  tvParallaxShiftDistanceY?: number;
  /**
   * *(Apple TV only)* May be used to change the appearance of the Apple TV parallax effect when this view goes in or out of focus.  Defaults to 0.05.
   *
   * @platform ios
   */
  tvParallaxTiltAngle?: number;
  /**
   * *(Apple TV only)* May be used to change the appearance of the Apple TV parallax effect when this view goes in or out of focus.  Defaults to 1.0.
   *
   * @platform ios
   */
  tvParallaxMagnification?: number;
}>;
export type ViewPropsIOS = Readonly<{
  /**
   * Whether this `View` should be rendered as a bitmap before compositing.
   *
   * @platform ios
   *
   * See https://reactnative.dev/docs/view#shouldrasterizeios
   */
  shouldRasterizeIOS?: boolean | undefined;
}>;
type ViewBaseProps = Readonly<{
  children?: React.ReactNode;
  style?: ViewStyleProp | undefined;
  /**
   * Views that are only used to layout their children or otherwise don't draw
   * anything may be automatically removed from the native hierarchy as an
   * optimization. Set this property to `false` to disable this optimization and
   * ensure that this `View` exists in the native view hierarchy.
   *
   * See https://reactnative.dev/docs/view#collapsable
   */
  collapsable?: boolean | undefined;
  /**
   * Setting to false prevents direct children of the view from being removed
   * from the native view hierarchy, similar to the effect of setting
   * `collapsable={false}` on each child.
   */
  collapsableChildren?: boolean | undefined;
  /**
   * Used to locate this view from native classes. Has precedence over `nativeID` prop.
   *
   * > This disables the 'layout-only view removal' optimization for this view!
   *
   * See https://reactnative.dev/docs/view#id
   */
  id?: string;
  /**
   * Used to locate this view in end-to-end tests.
   *
   * > This disables the 'layout-only view removal' optimization for this view!
   *
   * See https://reactnative.dev/docs/view#testid
   */
  testID?: string | undefined;
  /**
   * Used to locate this view from native classes.
   *
   * > This disables the 'layout-only view removal' optimization for this view!
   *
   * See https://reactnative.dev/docs/view#nativeid
   */
  nativeID?: string | undefined;
  /**
   * Whether this `View` needs to rendered offscreen and composited with an
   * alpha in order to preserve 100% correct colors and blending behavior.
   *
   * See https://reactnative.dev/docs/view#needsoffscreenalphacompositing
   */
  needsOffscreenAlphaCompositing?: boolean | undefined;
  /**
   * This defines how far a touch event can start away from the view.
   * Typical interface guidelines recommend touch targets that are at least
   * 30 - 40 points/density-independent pixels.
   *
   * > The touch area never extends past the parent view bounds and the Z-index
   * > of sibling views always takes precedence if a touch hits two overlapping
   * > views.
   *
   * See https://reactnative.dev/docs/view#hitslop
   */
  hitSlop?: EdgeInsetsOrSizeProp | undefined;
  /**
   * Controls whether the `View` can be the target of touch events.
   *
   * See https://reactnative.dev/docs/view#pointerevents
   */
  pointerEvents?: ("auto" | "box-none" | "box-only" | "none") | undefined;
  /**
   * This is a special performance property exposed by `RCTView` and is useful
   * for scrolling content when there are many subviews, most of which are
   * offscreen. For this property to be effective, it must be applied to a
   * view that contains many subviews that extend outside its bound. The
   * subviews must also have `overflow: hidden`, as should the containing view
   * (or one of its superviews).
   *
   * See https://reactnative.dev/docs/view#removeclippedsubviews
   */
  removeClippedSubviews?: boolean | undefined;
}>;
export type ViewProps = Readonly<Omit<DirectEventProps, keyof GestureResponderHandlers | keyof MouseEventProps | keyof PointerEventProps | keyof FocusEventProps | keyof TouchEventProps | keyof ViewPropsAndroid | keyof ViewPropsIOS | keyof AccessibilityProps | keyof ViewBaseProps | keyof {}> & Omit<GestureResponderHandlers, keyof MouseEventProps | keyof PointerEventProps | keyof FocusEventProps | keyof TouchEventProps | keyof ViewPropsAndroid | keyof ViewPropsIOS | keyof AccessibilityProps | keyof ViewBaseProps | keyof {}> & Omit<MouseEventProps, keyof PointerEventProps | keyof FocusEventProps | keyof TouchEventProps | keyof ViewPropsAndroid | keyof ViewPropsIOS | keyof AccessibilityProps | keyof ViewBaseProps | keyof {}> & Omit<PointerEventProps, keyof FocusEventProps | keyof TouchEventProps | keyof ViewPropsAndroid | keyof ViewPropsIOS | keyof AccessibilityProps | keyof ViewBaseProps | keyof {}> & Omit<FocusEventProps, keyof TouchEventProps | keyof ViewPropsAndroid | keyof ViewPropsIOS | keyof AccessibilityProps | keyof ViewBaseProps | keyof {}> & Omit<TouchEventProps, keyof ViewPropsAndroid | keyof ViewPropsIOS | keyof AccessibilityProps | keyof ViewBaseProps | keyof {}> & Omit<ViewPropsAndroid, keyof ViewPropsIOS | keyof AccessibilityProps | keyof ViewBaseProps | keyof {}> & Omit<ViewPropsIOS, keyof AccessibilityProps | keyof ViewBaseProps | keyof {}> & Omit<AccessibilityProps, keyof ViewBaseProps | keyof {}> & Omit<ViewBaseProps, keyof {}> & {}>;
