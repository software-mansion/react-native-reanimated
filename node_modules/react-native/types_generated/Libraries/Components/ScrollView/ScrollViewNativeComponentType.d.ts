/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @generated SignedSource<<3c9d02b3c8af0ce4aaa18e1cb46c15b9>>
 *
 * This file was translated from Flow by scripts/build-types/index.js.
 * Original file: packages/react-native/Libraries/Components/ScrollView/ScrollViewNativeComponentType.js
 */

import type { EdgeInsetsProp } from "../../StyleSheet/EdgeInsetsPropType";
import type { PointProp } from "../../StyleSheet/PointPropType";
import type { ColorValue } from "../../StyleSheet/StyleSheet";
import type { GestureResponderEvent, ScrollEvent } from "../../Types/CoreEventTypes";
import type { ViewProps } from "../View/ViewPropTypes";
export type ScrollViewNativeProps = Readonly<Omit<ViewProps, keyof {
  alwaysBounceHorizontal?: boolean | undefined;
  alwaysBounceVertical?: boolean | undefined;
  automaticallyAdjustContentInsets?: boolean | undefined;
  automaticallyAdjustKeyboardInsets?: boolean | undefined;
  automaticallyAdjustsScrollIndicatorInsets?: boolean | undefined;
  bounces?: boolean | undefined;
  bouncesZoom?: boolean | undefined;
  canCancelContentTouches?: boolean | undefined;
  centerContent?: boolean | undefined;
  contentInset?: EdgeInsetsProp | undefined;
  contentInsetAdjustmentBehavior?: ("automatic" | "scrollableAxes" | "never" | "always") | undefined;
  contentOffset?: PointProp | undefined;
  decelerationRate?: ("fast" | "normal" | number) | undefined;
  directionalLockEnabled?: boolean | undefined;
  disableIntervalMomentum?: boolean | undefined;
  endFillColor?: ColorValue | undefined;
  fadingEdgeLength?: number | undefined;
  indicatorStyle?: ("default" | "black" | "white") | undefined;
  isInvertedVirtualizedList?: boolean | undefined;
  keyboardDismissMode?: ("none" | "on-drag" | "interactive") | undefined;
  maintainVisibleContentPosition?: Readonly<{
    minIndexForVisible: number;
    autoscrollToTopThreshold?: number | undefined;
  }> | undefined;
  maximumZoomScale?: number | undefined;
  minimumZoomScale?: number | undefined;
  nestedScrollEnabled?: boolean | undefined;
  onMomentumScrollBegin?: ((event: ScrollEvent) => void) | undefined;
  onMomentumScrollEnd?: ((event: ScrollEvent) => void) | undefined;
  onScroll?: ((event: ScrollEvent) => void) | undefined;
  onScrollBeginDrag?: ((event: ScrollEvent) => void) | undefined;
  onScrollEndDrag?: ((event: ScrollEvent) => void) | undefined;
  onScrollToTop?: (event: ScrollEvent) => void;
  overScrollMode?: ("auto" | "always" | "never") | undefined;
  pagingEnabled?: boolean | undefined;
  persistentScrollbar?: boolean | undefined;
  pinchGestureEnabled?: boolean | undefined;
  scrollEnabled?: boolean | undefined;
  scrollEventThrottle?: number | undefined;
  scrollIndicatorInsets?: EdgeInsetsProp | undefined;
  scrollPerfTag?: string | undefined;
  scrollToOverflowEnabled?: boolean | undefined;
  scrollsToTop?: boolean | undefined;
  sendMomentumEvents?: boolean | undefined;
  showsHorizontalScrollIndicator?: boolean | undefined;
  showsVerticalScrollIndicator?: boolean | undefined;
  snapToAlignment?: ("start" | "center" | "end") | undefined;
  snapToEnd?: boolean | undefined;
  snapToInterval?: number | undefined;
  snapToOffsets?: ReadonlyArray<number> | undefined;
  snapToStart?: boolean | undefined;
  zoomScale?: number | undefined;
  onResponderGrant?: ((e: GestureResponderEvent) => void | boolean) | undefined;
}> & {
  alwaysBounceHorizontal?: boolean | undefined;
  alwaysBounceVertical?: boolean | undefined;
  automaticallyAdjustContentInsets?: boolean | undefined;
  automaticallyAdjustKeyboardInsets?: boolean | undefined;
  automaticallyAdjustsScrollIndicatorInsets?: boolean | undefined;
  bounces?: boolean | undefined;
  bouncesZoom?: boolean | undefined;
  canCancelContentTouches?: boolean | undefined;
  centerContent?: boolean | undefined;
  contentInset?: EdgeInsetsProp | undefined;
  contentInsetAdjustmentBehavior?: ("automatic" | "scrollableAxes" | "never" | "always") | undefined;
  contentOffset?: PointProp | undefined;
  decelerationRate?: ("fast" | "normal" | number) | undefined;
  directionalLockEnabled?: boolean | undefined;
  disableIntervalMomentum?: boolean | undefined;
  endFillColor?: ColorValue | undefined;
  fadingEdgeLength?: number | undefined;
  indicatorStyle?: ("default" | "black" | "white") | undefined;
  isInvertedVirtualizedList?: boolean | undefined;
  keyboardDismissMode?: ("none" | "on-drag" | "interactive") | undefined;
  maintainVisibleContentPosition?: Readonly<{
    minIndexForVisible: number;
    autoscrollToTopThreshold?: number | undefined;
  }> | undefined;
  maximumZoomScale?: number | undefined;
  minimumZoomScale?: number | undefined;
  nestedScrollEnabled?: boolean | undefined;
  onMomentumScrollBegin?: ((event: ScrollEvent) => void) | undefined;
  onMomentumScrollEnd?: ((event: ScrollEvent) => void) | undefined;
  onScroll?: ((event: ScrollEvent) => void) | undefined;
  onScrollBeginDrag?: ((event: ScrollEvent) => void) | undefined;
  onScrollEndDrag?: ((event: ScrollEvent) => void) | undefined;
  onScrollToTop?: (event: ScrollEvent) => void;
  overScrollMode?: ("auto" | "always" | "never") | undefined;
  pagingEnabled?: boolean | undefined;
  persistentScrollbar?: boolean | undefined;
  pinchGestureEnabled?: boolean | undefined;
  scrollEnabled?: boolean | undefined;
  scrollEventThrottle?: number | undefined;
  scrollIndicatorInsets?: EdgeInsetsProp | undefined;
  scrollPerfTag?: string | undefined;
  scrollToOverflowEnabled?: boolean | undefined;
  scrollsToTop?: boolean | undefined;
  sendMomentumEvents?: boolean | undefined;
  showsHorizontalScrollIndicator?: boolean | undefined;
  showsVerticalScrollIndicator?: boolean | undefined;
  snapToAlignment?: ("start" | "center" | "end") | undefined;
  snapToEnd?: boolean | undefined;
  snapToInterval?: number | undefined;
  snapToOffsets?: ReadonlyArray<number> | undefined;
  snapToStart?: boolean | undefined;
  zoomScale?: number | undefined;
  onResponderGrant?: ((e: GestureResponderEvent) => void | boolean) | undefined;
}>;
