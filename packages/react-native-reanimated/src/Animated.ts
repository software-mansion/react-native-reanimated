'use strict';
import type {
  AnimatedTransform as _AnimatedTransform,
  AnimateStyle as _AnimateStyle,
  EasingFunction as _EasingFunction,
  SharedValue as _SharedValue,
  StylesOrDefault as _StylesOrDefault,
} from './commonTypes';
import type { FlatListPropsWithLayout as _FlatListPropsWithLayout } from './component/FlatList';
import type { AnimatedScrollViewProps as _AnimatedScrollViewProps } from './component/ScrollView';
import type {
  Adaptable as _Adaptable,
  AdaptTransforms as _AdaptTransforms,
  AnimateProps as _AnimateProps,
  TransformStyleTypes as _TransformStyleTypes,
} from './helperTypes';
import type { DerivedValue as _DerivedValue } from './hook/useDerivedValue';
import type { Extrapolate as _Extrapolate } from './interpolateColor';

export { ReanimatedFlatList as FlatList } from './component/FlatList';
export { AnimatedImage as Image } from './component/Image';
export { AnimatedScrollView as ScrollView } from './component/ScrollView';
export { AnimatedText as Text } from './component/Text';
export { AnimatedView as View } from './component/View';
export {
  addWhitelistedNativeProps,
  addWhitelistedUIProps,
} from './ConfigHelper';
export { createAnimatedComponent } from './createAnimatedComponent';
/**
 * @deprecated Please import `Extrapolate` directly from
 *   `react-native-reanimated` instead of `Animated` namespace.
 */
export type Extrapolate = typeof _Extrapolate;
/**
 * @deprecated Please import `SharedValue` directly from
 *   `react-native-reanimated` instead of `Animated` namespace.
 */

export type SharedValue<T> = _SharedValue<T>;
/**
 * @deprecated Please import `DerivedValue` directly from
 *   `react-native-reanimated` instead of `Animated` namespace.
 */
export type DerivedValue<T> = _DerivedValue<T>;
/**
 * @deprecated Please import `Adaptable` directly from `react-native-reanimated`
 *   instead of `Animated` namespace.
 */
export type Adaptable<T> = _Adaptable<T>;
/**
 * @deprecated Please import `TransformStyleTypes` directly from
 *   `react-native-reanimated` instead of `Animated` namespace.
 */
export type TransformStyleTypes = _TransformStyleTypes;
/**
 * @deprecated Please import `AdaptTransforms` directly from
 *   `react-native-reanimated` instead of `Animated` namespace.
 */
export type AdaptTransforms<T> = _AdaptTransforms<T>;
/**
 * @deprecated Please import `AnimatedTransform` directly from
 *   `react-native-reanimated` instead of `Animated` namespace.
 */
export type AnimatedTransform = _AnimatedTransform;
/**
 * @deprecated Please import `AnimateStyle` directly from
 *   `react-native-reanimated` instead of `Animated` namespace.
 */
export type AnimateStyle<S> = _AnimateStyle<S>;
/**
 * @deprecated Please import `StylesOrDefault` directly from
 *   `react-native-reanimated` instead of `Animated` namespace.
 */
export type StylesOrDefault<S> = _StylesOrDefault<S>;
/**
 * @deprecated Please import `AnimateProps` directly from
 *   `react-native-reanimated` instead of `Animated` namespace.
 */
export type AnimateProps<P extends object> = _AnimateProps<P>;
/**
 * @deprecated Please import `EasingFunction` directly from
 *   `react-native-reanimated` instead of `Animated` namespace.
 */
export type EasingFunction = _EasingFunction;
/**
 * @deprecated Please import `AnimatedScrollViewProps` directly from
 *   `react-native-reanimated` instead of `Animated` namespace.
 */
export type AnimatedScrollViewProps = _AnimatedScrollViewProps;
/**
 * @deprecated Please import `FlatListPropsWithLayout` directly from
 *   `react-native-reanimated` instead of `Animated` namespace.
 */
export type FlatListPropsWithLayout<T> = _FlatListPropsWithLayout<T>;
