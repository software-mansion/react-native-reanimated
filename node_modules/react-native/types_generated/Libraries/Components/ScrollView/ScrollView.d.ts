/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @generated SignedSource<<242cb5518011ffcadda135e3e02c6cca>>
 *
 * This file was translated from Flow by scripts/build-types/index.js.
 * Original file: packages/react-native/Libraries/Components/ScrollView/ScrollView.js
 */

import type { HostInstance } from "../../../src/private/types/HostInstance";
import type { EdgeInsetsProp } from "../../StyleSheet/EdgeInsetsPropType";
import type { PointProp } from "../../StyleSheet/PointPropType";
import type { ViewStyleProp } from "../../StyleSheet/StyleSheet";
import type { ColorValue } from "../../StyleSheet/StyleSheet";
import type { ScrollEvent } from "../../Types/CoreEventTypes";
import type { KeyboardEvent } from "../Keyboard/Keyboard";
import type { ViewProps } from "../View/ViewPropTypes";
import type { ScrollViewStickyHeaderProps } from "./ScrollViewStickyHeader";
import View from "../View/View";
import ScrollViewContext from "./ScrollViewContext";
import * as React from "react";
export interface ScrollViewScrollToOptions {
  x?: number;
  y?: number;
  animated?: boolean;
}
export interface ScrollViewImperativeMethods {
  readonly getScrollResponder: () => ScrollResponderType;
  readonly getScrollableNode: () => number | undefined;
  readonly getInnerViewNode: () => number | undefined;
  readonly getInnerViewRef: () => InnerViewInstance | null;
  readonly getNativeScrollRef: () => HostInstance | null;
  readonly scrollTo: (options?: ScrollViewScrollToOptions | number, deprecatedX?: number, deprecatedAnimated?: boolean) => void;
  readonly scrollToEnd: (options?: ScrollViewScrollToOptions | undefined) => void;
  readonly flashScrollIndicators: () => void;
  readonly scrollResponderZoomTo: (rect: {
    x: number;
    y: number;
    width: number;
    height: number;
    animated?: boolean;
  }, animated?: boolean) => void;
  readonly scrollResponderScrollNativeHandleToKeyboard: (nodeHandle: number | HostInstance, additionalOffset?: number, preventNegativeScrollOffset?: boolean) => void;
}
export type DecelerationRateType = "fast" | "normal" | number;
export type ScrollResponderType = ScrollViewImperativeMethods;
export interface PublicScrollViewInstance extends HostInstance, ScrollViewImperativeMethods {}
type InnerViewInstance = React.ComponentRef<typeof View>;
export type ScrollViewPropsIOS = Readonly<{
  /**
   * Controls whether iOS should automatically adjust the content inset
   * for scroll views that are placed behind a navigation bar or
   * tab bar/ toolbar. The default value is true.
   * @platform ios
   */
  automaticallyAdjustContentInsets?: boolean | undefined;
  /**
   * Controls whether the ScrollView should automatically adjust its `contentInset`
   * and `scrollViewInsets` when the Keyboard changes its size. The default value is false.
   * @platform ios
   */
  automaticallyAdjustKeyboardInsets?: boolean | undefined;
  /**
   * Controls whether iOS should automatically adjust the scroll indicator
   * insets. The default value is true. Available on iOS 13 and later.
   * @platform ios
   */
  automaticallyAdjustsScrollIndicatorInsets?: boolean | undefined;
  /**
   * The amount by which the scroll view content is inset from the edges
   * of the scroll view. Defaults to `{top: 0, left: 0, bottom: 0, right: 0}`.
   * @platform ios
   */
  contentInset?: EdgeInsetsProp | undefined;
  /**
   * When true, the scroll view bounces when it reaches the end of the
   * content if the content is larger then the scroll view along the axis of
   * the scroll direction. When false, it disables all bouncing even if
   * the `alwaysBounce*` props are true. The default value is true.
   * @platform ios
   */
  bounces?: boolean | undefined;
  /**
   * By default, ScrollView has an active pan responder that hijacks panresponders
   * deeper in the render tree in order to prevent accidental touches while scrolling.
   * However, in certain occasions (such as when using snapToInterval) in a vertical scrollview
   * You may want to disable this behavior in order to prevent the ScrollView from blocking touches
   */
  disableScrollViewPanResponder?: boolean | undefined;
  /**
   * When true, gestures can drive zoom past min/max and the zoom will animate
   * to the min/max value at gesture end, otherwise the zoom will not exceed
   * the limits.
   * @platform ios
   */
  bouncesZoom?: boolean | undefined;
  /**
   * When true, the scroll view bounces horizontally when it reaches the end
   * even if the content is smaller than the scroll view itself. The default
   * value is true when `horizontal={true}` and false otherwise.
   * @platform ios
   */
  alwaysBounceHorizontal?: boolean | undefined;
  /**
   * When true, the scroll view bounces vertically when it reaches the end
   * even if the content is smaller than the scroll view itself. The default
   * value is false when `horizontal={true}` and true otherwise.
   * @platform ios
   */
  alwaysBounceVertical?: boolean | undefined;
  /**
   * When true, the scroll view automatically centers the content when the
   * content is smaller than the scroll view bounds; when the content is
   * larger than the scroll view, this property has no effect. The default
   * value is false.
   * @platform ios
   */
  centerContent?: boolean | undefined;
  /**
   * The style of the scroll indicators.
   *
   *   - `'default'` (the default), same as `black`.
   *   - `'black'`, scroll indicator is black. This style is good against a light background.
   *   - `'white'`, scroll indicator is white. This style is good against a dark background.
   *
   * @platform ios
   */
  indicatorStyle?: ("default" | "black" | "white") | undefined;
  /**
   * When true, the ScrollView will try to lock to only vertical or horizontal
   * scrolling while dragging.  The default value is false.
   * @platform ios
   */
  directionalLockEnabled?: boolean | undefined;
  /**
   * When false, once tracking starts, won't try to drag if the touch moves.
   * The default value is true.
   * @platform ios
   */
  canCancelContentTouches?: boolean | undefined;
  /**
   * The maximum allowed zoom scale. The default value is 1.0.
   * @platform ios
   */
  maximumZoomScale?: number | undefined;
  /**
   * The minimum allowed zoom scale. The default value is 1.0.
   * @platform ios
   */
  minimumZoomScale?: number | undefined;
  /**
   * When true, ScrollView allows use of pinch gestures to zoom in and out.
   * The default value is true.
   * @platform ios
   */
  pinchGestureEnabled?: boolean | undefined;
  /**
   * The amount by which the scroll view indicators are inset from the edges
   * of the scroll view. This should normally be set to the same value as
   * the `contentInset`. Defaults to `{0, 0, 0, 0}`.
   * @platform ios
   */
  scrollIndicatorInsets?: EdgeInsetsProp | undefined;
  /**
   * When true, the scroll view can be programmatically scrolled beyond its
   * content size. The default value is false.
   * @platform ios
   */
  scrollToOverflowEnabled?: boolean | undefined;
  /**
   * When true, the scroll view scrolls to top when the status bar is tapped.
   * The default value is true.
   * @platform ios
   */
  scrollsToTop?: boolean | undefined;
  /**
   * Fires when the scroll view scrolls to top after the status bar has been tapped
   * @platform ios
   */
  onScrollToTop?: (event: ScrollEvent) => void;
  /**
   * When true, shows a horizontal scroll indicator.
   * The default value is true.
   */
  showsHorizontalScrollIndicator?: boolean | undefined;
  /**
   * The current scale of the scroll view content. The default value is 1.0.
   * @platform ios
   */
  zoomScale?: number | undefined;
  /**
   * This property specifies how the safe area insets are used to modify the
   * content area of the scroll view. The default value of this property is
   * "never".
   * @platform ios
   */
  contentInsetAdjustmentBehavior?: ("automatic" | "scrollableAxes" | "never" | "always") | undefined;
}>;
export type ScrollViewPropsAndroid = Readonly<{
  /**
   * Enables nested scrolling for Android API level 21+.
   * Nested scrolling is supported by default on iOS
   * @platform android
   */
  nestedScrollEnabled?: boolean | undefined;
  /**
   * Sometimes a scrollview takes up more space than its content fills. When this is
   * the case, this prop will fill the rest of the scrollview with a color to avoid setting
   * a background and creating unnecessary overdraw. This is an advanced optimization
   * that is not needed in the general case.
   * @platform android
   */
  endFillColor?: ColorValue | undefined;
  /**
   * Tag used to log scroll performance on this scroll view. Will force
   * momentum events to be turned on (see sendMomentumEvents). This doesn't do
   * anything out of the box and you need to implement a custom native
   * FpsListener for it to be useful.
   * @platform android
   */
  scrollPerfTag?: string | undefined;
  /**
   * Used to override default value of overScroll mode.
   *
   * Possible values:
   *
   *  - `'auto'` - Default value, allow a user to over-scroll
   *    this view only if the content is large enough to meaningfully scroll.
   *  - `'always'` - Always allow a user to over-scroll this view.
   *  - `'never'` - Never allow a user to over-scroll this view.
   *
   * @platform android
   */
  overScrollMode?: ("auto" | "always" | "never") | undefined;
  /**
   * Causes the scrollbars not to turn transparent when they are not in use.
   * The default value is false.
   *
   * @platform android
   */
  persistentScrollbar?: boolean | undefined;
  /**
   * Fades out the edges of the scroll content.
   *
   * If the value is greater than 0, the fading edges will be set accordingly
   * to the current scroll direction and position,
   * indicating if there is more content to show.
   *
   * The default value is 0.
   *
   * @platform android
   */
  fadingEdgeLength?: number | undefined;
}>;
type StickyHeaderComponentType = (props: Omit<ScrollViewStickyHeaderProps, keyof {
  ref?: React.Ref<Readonly<{
    setNextHeaderY: ($$PARAM_0$$: number) => void;
  }>>;
}> & {
  ref?: React.Ref<Readonly<{
    setNextHeaderY: ($$PARAM_0$$: number) => void;
  }>>;
}) => React.ReactNode;
type ScrollViewBaseProps = Readonly<{
  /**
   * These styles will be applied to the scroll view content container which
   * wraps all of the child views. Example:
   *
   * ```
   * return (
   *   <ScrollView contentContainerStyle={styles.contentContainer}>
   *   </ScrollView>
   * );
   * ...
   * const styles = StyleSheet.create({
   *   contentContainer: {
   *     paddingVertical: 20
   *   }
   * });
   * ```
   */
  contentContainerStyle?: ViewStyleProp | undefined;
  /**
   * Used to manually set the starting scroll offset.
   * The default value is `{x: 0, y: 0}`.
   */
  contentOffset?: PointProp | undefined;
  /**
   * When true, the scroll view stops on the next index (in relation to scroll
   * position at release) regardless of how fast the gesture is. This can be
   * used for pagination when the page is less than the width of the
   * horizontal ScrollView or the height of the vertical ScrollView. The default value is false.
   */
  disableIntervalMomentum?: boolean | undefined;
  /**
   * A floating-point number that determines how quickly the scroll view
   * decelerates after the user lifts their finger. You may also use string
   * shortcuts `"normal"` and `"fast"` which match the underlying iOS settings
   * for `UIScrollViewDecelerationRateNormal` and
   * `UIScrollViewDecelerationRateFast` respectively.
   *
   *   - `'normal'`: 0.998 on iOS, 0.985 on Android (the default)
   *   - `'fast'`: 0.99 on iOS, 0.9 on Android
   */
  decelerationRate?: DecelerationRateType | undefined;
  /**
   * *Experimental, iOS Only*. The API is experimental and will change in future releases.
   *
   * Controls how much distance is travelled after user stops scrolling.
   * Value greater than 1 will increase the distance travelled.
   * Value less than 1 will decrease the distance travelled.
   *
   * @deprecated
   *
   * The default value is 1.
   */
  experimental_endDraggingSensitivityMultiplier?: number | undefined;
  /**
   * When true, the scroll view's children are arranged horizontally in a row
   * instead of vertically in a column. The default value is false.
   */
  horizontal?: boolean | undefined;
  /**
   * If sticky headers should stick at the bottom instead of the top of the
   * ScrollView. This is usually used with inverted ScrollViews.
   */
  invertStickyHeaders?: boolean | undefined;
  /**
   * Determines whether the keyboard gets dismissed in response to a drag.
   *
   * *Cross platform*
   *
   *   - `'none'` (the default), drags do not dismiss the keyboard.
   *   - `'on-drag'`, the keyboard is dismissed when a drag begins.
   *
   * *iOS Only*
   *
   *   - `'interactive'`, the keyboard is dismissed interactively with the drag and moves in
   *     synchrony with the touch; dragging upwards cancels the dismissal.
   *     On android this is not supported and it will have the same behavior as 'none'.
   */
  keyboardDismissMode?: ("none" | "on-drag" | "interactive") | undefined;
  /**
   * Determines when the keyboard should stay visible after a tap.
   *
   *   - `'never'` (the default), tapping outside of the focused text input when the keyboard
   *     is up dismisses the keyboard. When this happens, children won't receive the tap.
   *   - `'always'`, the keyboard will not dismiss automatically, and the scroll view will not
   *     catch taps, but children of the scroll view can catch taps.
   *   - `'handled'`, the keyboard will not dismiss automatically when the tap was handled by
   *     a children, (or captured by an ancestor).
   *   - `false`, deprecated, use 'never' instead
   *   - `true`, deprecated, use 'always' instead
   */
  keyboardShouldPersistTaps?: ("always" | "never" | "handled" | true | false) | undefined;
  /**
   * When set, the scroll view will adjust the scroll position so that the first child that is
   * partially or fully visible and at or beyond `minIndexForVisible` will not change position.
   * This is useful for lists that are loading content in both directions, e.g. a chat thread,
   * where new messages coming in might otherwise cause the scroll position to jump. A value of 0
   * is common, but other values such as 1 can be used to skip loading spinners or other content
   * that should not maintain position.
   *
   * The optional `autoscrollToTopThreshold` can be used to make the content automatically scroll
   * to the top after making the adjustment if the user was within the threshold of the top before
   * the adjustment was made. This is also useful for chat-like applications where you want to see
   * new messages scroll into place, but not if the user has scrolled up a ways and it would be
   * disruptive to scroll a bunch.
   *
   * Caveat 1: Reordering elements in the scrollview with this enabled will probably cause
   * jumpiness and jank. It can be fixed, but there are currently no plans to do so. For now,
   * don't re-order the content of any ScrollViews or Lists that use this feature.
   *
   * Caveat 2: This simply uses `contentOffset` and `frame.origin` in native code to compute
   * visibility. Occlusion, transforms, and other complexity won't be taken into account as to
   * whether content is "visible" or not.
   *
   */
  maintainVisibleContentPosition?: Readonly<{
    minIndexForVisible: number;
    autoscrollToTopThreshold?: number | undefined;
  }> | undefined;
  /**
   * Called when the momentum scroll starts (scroll which occurs as the ScrollView glides to a stop).
   */
  onMomentumScrollBegin?: ((event: ScrollEvent) => void) | undefined;
  /**
   * Called when the momentum scroll ends (scroll which occurs as the ScrollView glides to a stop).
   */
  onMomentumScrollEnd?: ((event: ScrollEvent) => void) | undefined;
  /**
   * Fires at most once per frame during scrolling.
   */
  onScroll?: ((event: ScrollEvent) => void) | undefined;
  /**
   * Called when the user begins to drag the scroll view.
   */
  onScrollBeginDrag?: ((event: ScrollEvent) => void) | undefined;
  /**
   * Called when the user stops dragging the scroll view and it either stops
   * or begins to glide.
   */
  onScrollEndDrag?: ((event: ScrollEvent) => void) | undefined;
  /**
   * Called when scrollable content view of the ScrollView changes.
   *
   * Handler function is passed the content width and content height as parameters:
   * `(contentWidth, contentHeight)`
   *
   * It's implemented using onLayout handler attached to the content container
   * which this ScrollView renders.
   */
  onContentSizeChange?: (contentWidth: number, contentHeight: number) => void;
  onKeyboardDidShow?: (event: KeyboardEvent) => void;
  onKeyboardDidHide?: (event: KeyboardEvent) => void;
  onKeyboardWillShow?: (event: KeyboardEvent) => void;
  onKeyboardWillHide?: (event: KeyboardEvent) => void;
  /**
   * When true, the scroll view stops on multiples of the scroll view's size
   * when scrolling. This can be used for horizontal pagination. The default
   * value is false.
   */
  pagingEnabled?: boolean | undefined;
  /**
   * When false, the view cannot be scrolled via touch interaction.
   * The default value is true.
   *
   * Note that the view can always be scrolled by calling `scrollTo`.
   */
  scrollEnabled?: boolean | undefined;
  /**
   * Limits how often scroll events will be fired while scrolling, specified as
   * a time interval in ms. This may be useful when expensive work is performed
   * in response to scrolling. Values <= `16` will disable throttling,
   * regardless of the refresh rate of the device.
   */
  scrollEventThrottle?: number | undefined;
  /**
   * When true, shows a vertical scroll indicator.
   * The default value is true.
   */
  showsVerticalScrollIndicator?: boolean | undefined;
  /**
   * When true, Sticky header is hidden when scrolling down, and dock at the top
   * when scrolling up
   */
  stickyHeaderHiddenOnScroll?: boolean | undefined;
  /**
   * An array of child indices determining which children get docked to the
   * top of the screen when scrolling. For example, passing
   * `stickyHeaderIndices={[0]}` will cause the first child to be fixed to the
   * top of the scroll view. This property is not supported in conjunction
   * with `horizontal={true}`.
   */
  stickyHeaderIndices?: ReadonlyArray<number> | undefined;
  /**
   * A React Component that will be used to render sticky headers.
   * To be used together with `stickyHeaderIndices` or with `SectionList`, defaults to `ScrollViewStickyHeader`.
   * You may need to set this if your sticky header uses custom transforms (eg. translation),
   * for example when you want your list to have an animated hidable header.
   */
  StickyHeaderComponent?: StickyHeaderComponentType;
  /**
   * When `snapToInterval` is set, `snapToAlignment` will define the relationship
   * of the snapping to the scroll view.
   *
   *   - `'start'` (the default) will align the snap at the left (horizontal) or top (vertical)
   *   - `'center'` will align the snap in the center
   *   - `'end'` will align the snap at the right (horizontal) or bottom (vertical)
   */
  snapToAlignment?: ("start" | "center" | "end") | undefined;
  /**
   * When set, causes the scroll view to stop at multiples of the value of
   * `snapToInterval`. This can be used for paginating through children
   * that have lengths smaller than the scroll view. Typically used in
   * combination with `snapToAlignment` and `decelerationRate="fast"`.
   *
   * Overrides less configurable `pagingEnabled` prop.
   */
  snapToInterval?: number | undefined;
  /**
   * When set, causes the scroll view to stop at the defined offsets.
   * This can be used for paginating through variously sized children
   * that have lengths smaller than the scroll view. Typically used in
   * combination with `decelerationRate="fast"`.
   *
   * Overrides less configurable `pagingEnabled` and `snapToInterval` props.
   */
  snapToOffsets?: ReadonlyArray<number> | undefined;
  /**
   * Use in conjunction with `snapToOffsets`. By default, the beginning
   * of the list counts as a snap offset. Set `snapToStart` to false to disable
   * this behavior and allow the list to scroll freely between its start and
   * the first `snapToOffsets` offset.
   * The default value is true.
   */
  snapToStart?: boolean | undefined;
  /**
   * Use in conjunction with `snapToOffsets`. By default, the end
   * of the list counts as a snap offset. Set `snapToEnd` to false to disable
   * this behavior and allow the list to scroll freely between its end and
   * the last `snapToOffsets` offset.
   * The default value is true.
   */
  snapToEnd?: boolean | undefined;
  /**
   * Experimental: When true, offscreen child views (whose `overflow` value is
   * `hidden`) are removed from their native backing superview when offscreen.
   * This can improve scrolling performance on long lists. The default value is
   * true.
   */
  removeClippedSubviews?: boolean | undefined;
  /**
   * A RefreshControl component, used to provide pull-to-refresh
   * functionality for the ScrollView. Only works for vertical ScrollViews
   * (`horizontal` prop must be `false`).
   *
   * See [RefreshControl](docs/refreshcontrol.html).
   */
  refreshControl?: React.JSX.Element | undefined;
  children?: React.ReactNode;
  /**
   * A ref to the inner View element of the ScrollView. This should be used
   * instead of calling `getInnerViewRef`.
   */
  innerViewRef?: React.Ref<InnerViewInstance>;
  /**
   * A ref to the Native ScrollView component. This ref can be used to call
   * all of ScrollView's public methods, in addition to native methods like
   * measure, measureLayout, etc.
   */
  scrollViewRef?: React.Ref<PublicScrollViewInstance>;
}>;
export type ScrollViewProps = Readonly<Omit<ViewProps, keyof ScrollViewPropsIOS | keyof ScrollViewPropsAndroid | keyof ScrollViewBaseProps | keyof {}> & Omit<ScrollViewPropsIOS, keyof ScrollViewPropsAndroid | keyof ScrollViewBaseProps | keyof {}> & Omit<ScrollViewPropsAndroid, keyof ScrollViewBaseProps | keyof {}> & Omit<ScrollViewBaseProps, keyof {}> & {}>;
export type ScrollViewComponentStatics = Readonly<{
  Context: typeof ScrollViewContext;
}>;
declare const ScrollViewWrapper: (props: Omit<ScrollViewProps, keyof {
  ref?: React.Ref<PublicScrollViewInstance>;
}> & {
  ref?: React.Ref<PublicScrollViewInstance>;
}) => React.ReactNode;
declare const $$ScrollView: typeof ScrollViewWrapper & ScrollViewComponentStatics;
declare type $$ScrollView = typeof $$ScrollView;
export default $$ScrollView;
