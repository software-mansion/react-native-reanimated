/*
This file is a legacy remainder of manual types from react-native-reanimated.d.ts file. 
I wasn't able to get rid of all of them from the code. 
They should be treated as a temporary solution
until time comes to refactor the code and get necessary types right. 
This will not be easy though! 
*/

import type {
  ImageStyle,
  RegisteredStyle,
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

type MaybeSharedValue<TValue> = TValue | TValue extends AnimatableValue
  ? SharedValue<TValue>
  : never;

type MaybeSharedValueRecursive<TValue> = TValue extends (infer TItem)[]
  ? SharedValue<TItem[]> | (MaybeSharedValueRecursive<TItem> | TItem)[]
  : TValue extends object
  ?
      | SharedValue<TValue>
      | {
          [TKey in keyof TValue]:
            | MaybeSharedValueRecursive<TValue[TKey]>
            | TValue[TKey];
        }
  : MaybeSharedValue<TValue>;

type DefaultStyle = ViewStyle & ImageStyle & TextStyle;

// Ideally we want AnimatedStyle to not be generic, but there are
// so many depenedencies on it being generic that it's not feasible at the moment.
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
type PickStyleProps<TProps> = Pick<
  TProps,
  {
    [Key in keyof TProps]-?: Key extends `${string}Style` | 'style'
      ? Key
      : never;
  }[keyof TProps]
>;

type StyleProps<TProps extends object> = {
  [TKey in keyof PickStyleProps<TProps>]: StyleProp<
    AnimatedStyle<TProps[TKey]>
  >;
};

type NonStyleAnimatedProps<TProps extends object> = {
  [K in keyof Omit<TProps, keyof PickStyleProps<TProps> | 'style'>]:
    | TProps[K]
    | SharedValue<TProps[K]>;
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

type AnimatedPropsProp<TProps extends object> = NonStyleAnimatedProps<TProps> &
  StyleProps<TProps> &
  LayoutProps &
  SharedTransitionProps;

export type AnimatedProps<TProps extends object> =
  NonStyleAnimatedProps<TProps> &
    StyleProps<TProps> &
    LayoutProps &
    SharedTransitionProps & {
      animatedProps?: Partial<AnimatedPropsProp<TProps>>;
    };

export type AnimatedPropsAdapterFunction = (
  props: Record<string, unknown>
) => void;

export type useAnimatedPropsType = <TProps extends object>(
  updater: () => Partial<TProps>,
  deps?: DependencyList | null,
  adapters?:
    | AnimatedPropsAdapterFunction
    | AnimatedPropsAdapterFunction[]
    | null
) => Partial<TProps>;

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

/**
 * @deprecated This type is no longer relevant.
 */
export type AnimatedStyleProp<T> =
  | AnimatedStyle<T>
  | RegisteredStyle<AnimatedStyle<T>>;

/**
 * @deprecated Please use `AnimatedProps` type instead.
 */
export type AnimateProps<TProps extends object> = AnimatedProps<TProps>;
