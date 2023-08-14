/*
This file is a legacy remainder of manual types from react-native-reanimated.d.ts file. 
I wasn't able to get rid of all of them from the code. 
They should be treated as a temporary solution
until time comes to refactor the code and get necessary types right. 
This will not be easy though! 
*/

import type {
  ImageStyle,
  StyleProp,
  TextStyle,
  TransformsStyle,
  ViewStyle,
} from 'react-native';
import type { AnimatableValue, SharedValue } from './commonTypes';
import type { BaseAnimationBuilder } from './layoutReanimation/animationBuilder/BaseAnimationBuilder';
import type {
  EntryExitAnimationFunction,
  LayoutAnimationFunction,
} from './layoutReanimation/animationBuilder/commonTypes';
import type { ReanimatedKeyframe } from './layoutReanimation/animationBuilder/Keyframe';
import type { SharedTransition } from './layoutReanimation/sharedTransitions';
import type { DependencyList } from './hook/commonTypes';

export type TransformArrayItem = NonNullable<
  TransformsStyle['transform']
>[number];

export type AnimatedTransform = MaybeSharedValueRecursive<
  TransformsStyle['transform']
>;

type MaybeSharedValue<Value> = Value | Value extends AnimatableValue
  ? SharedValue<Value>
  : never;

export type MaybeSharedValueRecursive<Value> =
  Value extends (infer InnerValue)[]
    ?
        | SharedValue<InnerValue[]>
        | (MaybeSharedValueRecursive<InnerValue> | InnerValue)[]
    : Value extends object
    ?
        | SharedValue<Value>
        | { [K in keyof Value]: MaybeSharedValueRecursive<Value[K]> | Value[K] }
    : MaybeSharedValue<Value>;

type DefaultStyle = ViewStyle & ImageStyle & TextStyle;

export type AnimatedStyle<Style = DefaultStyle> =
  | Style
  | MaybeSharedValueRecursive<Style>;

type EntryOrExitLayoutType =
  | BaseAnimationBuilder
  | typeof BaseAnimationBuilder
  | EntryExitAnimationFunction
  | ReanimatedKeyframe;

/*
  Style type properties (properties that extends StyleProp<ViewStyle>)
  can be defined with other property names than "style". For example `contentContainerStyle` in FlatList.
  Type definition for all style type properties should act similarly, hence we
  pick keys with 'Style' substring with the use of this utility type.
*/
type PickStyleProps<T> = Pick<
  T,
  {
    [Key in keyof T]-?: Key extends `${string}Style` | 'style' ? Key : never;
  }[keyof T]
>;

type StyleProps<P extends object> = {
  [K in keyof PickStyleProps<P>]: StyleProp<
    AnimatedStyle<PickStyleProps<P>[K]>
  >;
};

type NonStyleAnimatedProps<P extends object> = {
  [K in keyof Omit<P, keyof PickStyleProps<P> | 'style'>]:
    | P[K]
    | SharedValue<P[K]>;
};

type LayoutProps = {
  layout?:
    | BaseAnimationBuilder
    | LayoutAnimationFunction
    | typeof BaseAnimationBuilder;
  entering?: EntryOrExitLayoutType;
  exiting?: EntryOrExitLayoutType;
};

type SharedTransitionProps = {
  sharedTransitionTag?: string;
  sharedTransitionStyle?: SharedTransition;
};

type AnimatedPropsProp<Props extends object> = NonStyleAnimatedProps<Props> &
  StyleProps<Props> &
  LayoutProps &
  SharedTransitionProps;

export type AnimateProps<Props extends object> = NonStyleAnimatedProps<Props> &
  StyleProps<Props> &
  LayoutProps &
  SharedTransitionProps & {
    animatedProps?: Partial<AnimatedPropsProp<Props>>;
  };

export type AnimatedProps<Props extends object> = AnimateProps<Props>;

export type AnimatedPropsAdapterFunction = (
  props: Record<string, unknown>
) => void;

export type useAnimatedPropsType = <T extends object>(
  updater: () => Partial<T>,
  deps?: DependencyList | null,
  adapters?:
    | AnimatedPropsAdapterFunction
    | AnimatedPropsAdapterFunction[]
    | null
) => Partial<T>;

// THE LAND OF THE DEPRECATED

/**
 * @deprecated This type is no longer relevant.
 */
export type Adaptable<T> =
  | T
  | ReadonlyArray<T | ReadonlyArray<T>>
  | SharedValue<T>;

/**
 * @deprecated This type is no longer relevant.
 */
export type AdaptTransforms<T> = {
  [P in keyof T]: Adaptable<T[P]>;
};

/**
 * @deprecated Please use `TransformArrayItem` type instead.
 */
export type TransformStyleTypes = TransformArrayItem;

/**
 * @deprecated Please use `AnimatedStyle` type instead.
 */
export type AnimateStyle<Style = DefaultStyle> = AnimatedStyle<Style>;

/**
 * @deprecated This type is no longer relevant.
 */
export type StylesOrDefault<T> = 'style' extends keyof T
  ? MaybeSharedValueRecursive<T['style']>
  : Record<string, unknown>;
