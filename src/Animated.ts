import type { Extrapolate as _Extrapolate } from './reanimated2/interpolateColor';
import type { SharedValue as _SharedValue } from './reanimated2/commonTypes';
import type { DerivedValue as _DerivedValue } from './reanimated2/hook/useDerivedValue';
import type {
  TransformStyleTypes as _TransformStyleTypes,
  Adaptable as _Adaptable,
  AdaptTransforms as _AdaptTransforms,
  AnimatedTransform as _AnimatedTransform,
  AnimateStyle as _AnimateStyle,
  StylesOrDefault as _StylesOrDefault,
  AnimateProps as _AnimateProps,
} from './reanimated2/helperTypes';
import type { EasingFunction as _EasingFunction } from './reanimated2/Easing';
import {
  addWhitelistedNativeProps as _addWhitelistedNativeProps,
  addWhitelistedUIProps as _addWhitelistedUIProps,
} from './ConfigHelper';
import type { AnimatedScrollViewProps as _AnimatedScrollViewProps } from './reanimated2/component/ScrollView';
import type { FlatListPropsWithLayout as _FlatListPropsWithLayout } from './reanimated2/component/FlatList';
export { default as createAnimatedComponent } from './createAnimatedComponent';

export { AnimatedText as Text } from './reanimated2/component/Text';
export { AnimatedView as View } from './reanimated2/component/View';
export { AnimatedScrollView as ScrollView } from './reanimated2/component/ScrollView';
export { AnimatedImage as Image } from './reanimated2/component/Image';
export { ReanimatedFlatList as FlatList } from './reanimated2/component/FlatList';
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
 * @deprecated Please import `addWhitelistedNativeProps` directly from `react-native-reanimated` instead of `Animated` namespace.
 * */
export const addWhitelistedNativeProps = _addWhitelistedNativeProps;
/**
 * @deprecated Please import `addWhitelistedUIProps` directly from `react-native-reanimated` instead of `Animated` namespace.
 * */
export const addWhitelistedUIProps = _addWhitelistedUIProps;
/**
 * @deprecated Please import `AnimatedScrollViewProps` directly from `react-native-reanimated` instead of `Animated` namespace.
 * */
export type AnimatedScrollViewProps = _AnimatedScrollViewProps;
/**
 * @deprecated Please import `FlatListPropsWithLayout` directly from `react-native-reanimated` instead of `Animated` namespace.
 * */
export type FlatListPropsWithLayout<T> = _FlatListPropsWithLayout<T>;
