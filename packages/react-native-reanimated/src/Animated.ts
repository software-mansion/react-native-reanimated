'use strict';
import type { Extrapolate as _Extrapolate } from './interpolateColor';
import type { SharedValue as _SharedValue } from './commonTypes';
import type { DerivedValue as _DerivedValue } from './hook/useDerivedValue';
import type {
  TransformStyleTypes as _TransformStyleTypes,
  Adaptable as _Adaptable,
  AdaptTransforms as _AdaptTransforms,
  AnimatedTransform as _AnimatedTransform,
  AnimateStyle as _AnimateStyle,
  StylesOrDefault as _StylesOrDefault,
  AnimateProps as _AnimateProps,
} from './helperTypes';
import type { EasingFunction as _EasingFunction } from './Easing';

import type { AnimatedScrollViewProps as _AnimatedScrollViewProps } from './component/ScrollView';
import type { FlatListPropsWithLayout as _FlatListPropsWithLayout } from './component/FlatList';

export { createAnimatedComponent } from './createAnimatedComponent';
export { AnimatedText as Text } from './component/Text';
export { AnimatedView as View } from './component/View';
export { AnimatedScrollView as ScrollView } from './component/ScrollView';
export { AnimatedImage as Image } from './component/Image';
export { ReanimatedFlatList as FlatList } from './component/FlatList';
export {
  addWhitelistedNativeProps,
  addWhitelistedUIProps,
} from './ConfigHelper';
/**
 * @deprecated Please import `Extrapolate` directly from `react-native-reanimated` instead of `Animated` namespace.
 */
export type Extrapolate = typeof _Extrapolate;
/**
 * @deprecated Please import `SharedValue` directly from `react-native-reanimated` instead of `Animated` namespace.
 */

export type SharedValue<T> = _SharedValue<T>;
/**
 * @deprecated Please import `DerivedValue` directly from `react-native-reanimated` instead of `Animated` namespace.
 */
export type DerivedValue<T> = _DerivedValue<T>;
/**
 * @deprecated Please import `Adaptable` directly from `react-native-reanimated` instead of `Animated` namespace.
 */
export type Adaptable<T> = _Adaptable<T>;
/**
 * @deprecated Please import `TransformStyleTypes` directly from `react-native-reanimated` instead of `Animated` namespace.
 * */
export type TransformStyleTypes = _TransformStyleTypes;
/**
 * @deprecated Please import `AdaptTransforms` directly from `react-native-reanimated` instead of `Animated` namespace.
 * */
export type AdaptTransforms<T> = _AdaptTransforms<T>;
/**
 * @deprecated Please import `AnimatedTransform` directly from `react-native-reanimated` instead of `Animated` namespace.
 */
export type AnimatedTransform = _AnimatedTransform;
/**
 * @deprecated Please import `AnimateStyle` directly from `react-native-reanimated` instead of `Animated` namespace.
 * */
export type AnimateStyle<S> = _AnimateStyle<S>;
/**
 * @deprecated Please import `StylesOrDefault` directly from `react-native-reanimated` instead of `Animated` namespace.
 * */
export type StylesOrDefault<S> = _StylesOrDefault<S>;
/**
 * @deprecated Please import `AnimateProps` directly from `react-native-reanimated` instead of `Animated` namespace.
 * */
export type AnimateProps<P extends object> = _AnimateProps<P>;
/**
 * @deprecated Please import `EasingFunction` directly from `react-native-reanimated` instead of `Animated` namespace.
 * */
export type EasingFunction = _EasingFunction;
/**
 * @deprecated Please import `AnimatedScrollViewProps` directly from `react-native-reanimated` instead of `Animated` namespace.
 * */
export type AnimatedScrollViewProps = _AnimatedScrollViewProps;
/**
 * @deprecated Please import `FlatListPropsWithLayout` directly from `react-native-reanimated` instead of `Animated` namespace.
 * */
export type FlatListPropsWithLayout<T> = _FlatListPropsWithLayout<T>;
