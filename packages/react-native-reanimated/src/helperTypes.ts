'use strict';
/*
This file is a legacy remainder of manual types from react-native-reanimated.d.ts file. 
I wasn't able to get rid of all of them from the code. 
They should be treated as a temporary solution
until time comes to refactor the code and get necessary types right. 
This will not be easy though! 
*/

import type { RegisteredStyle, StyleProp } from 'react-native';

import type {
  AnimatedStyle,
  EntryExitAnimationFunction,
  LayoutAnimationFunction,
  SharedValue,
  TransformArrayItem,
} from './commonTypes';
import type { CSSStyle } from './css/types/props';
import type { BaseAnimationBuilder } from './layoutReanimation/animationBuilder/BaseAnimationBuilder';
import type { ReanimatedKeyframe } from './layoutReanimation/animationBuilder/Keyframe';

export type EntryOrExitLayoutType =
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
type PickStyleProps<Props> = Pick<
  Props,
  {
    [Key in keyof Props]-?: Key extends `${string}Style` | 'style'
      ? Key
      : never;
  }[keyof Props]
>;

type AnimatedStyleProps<Props extends object> = {
  [Key in keyof PickStyleProps<Props>]: StyleProp<AnimatedStyle<Props[Key]>>;
};

/** Component props that are not specially handled by us. */
type RestProps<Props extends object> = {
  [K in keyof Omit<Props, keyof PickStyleProps<Props> | 'style'>]:
    | Props[K]
    | SharedValue<Props[K]>;
};

type LayoutProps = {
  /**
   * Lets you animate the layout changes when components are added to or removed
   * from the view hierarchy.
   *
   * You can use the predefined layout transitions (eg. `LinearTransition`,
   * `FadingTransition`) or create your own ones.
   *
   * @see https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/layout-transitions
   */
  layout?:
    | BaseAnimationBuilder
    | LayoutAnimationFunction
    | typeof BaseAnimationBuilder;
  /**
   * Lets you animate an element when it's added to or removed from the view
   * hierarchy.
   *
   * You can use the predefined entering animations (eg. `FadeIn`,
   * `SlideInLeft`) or create your own ones.
   *
   * @see https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/entering-exiting-animations
   */
  entering?: EntryOrExitLayoutType;
  /**
   * Lets you animate an element when it's added to or removed from the view
   * hierarchy.
   *
   * You can use the predefined entering animations (eg. `FadeOut`,
   * `SlideOutRight`) or create your own ones.
   *
   * @see https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/entering-exiting-animations
   */
  exiting?: EntryOrExitLayoutType;
};

type AnimatedPropsProp<Props extends object> = RestProps<Props> &
  AnimatedStyleProps<Props> &
  LayoutProps;

export type AnimatedProps<Props extends object> = RestProps<Props> &
  AnimatedStyleProps<Props> &
  LayoutProps & {
    /**
     * Lets you animate component props.
     *
     * @see https://docs.swmansion.com/react-native-reanimated/docs/core/useAnimatedProps
     */
    animatedProps?: CSSStyle<Partial<AnimatedPropsProp<Props>>>;
  };

// THE LAND OF THE DEPRECATED

/** @deprecated This type is no longer relevant. */
export type Adaptable<T> =
  | T
  | ReadonlyArray<T | ReadonlyArray<T>>
  | SharedValue<T>;

/** @deprecated This type is no longer relevant. */
export type AdaptTransforms<T> = {
  [P in keyof T]: Adaptable<T[P]>;
};

/** @deprecated Please use {@link TransformArrayItem} type instead. */
export type TransformStyleTypes = TransformArrayItem;

/** @deprecated This type is no longer relevant. */
export type AnimatedStyleProp<T> =
  | AnimatedStyle<T>
  | RegisteredStyle<AnimatedStyle<T>>;

/** @deprecated Please use {@link AnimatedProps} type instead. */
export type AnimateProps<Props extends object> = AnimatedProps<Props>;
