'use strict';
/*
This file is a legacy remainder of manual types from react-native-reanimated.d.ts file. 
I wasn't able to get rid of all of them from the code. 
They should be treated as a temporary solution
until time comes to refactor the code and get necessary types right. 
This will not be easy though! 
*/

import type { StyleProp } from 'react-native';

import type {
  AnimatedStyle,
  EntryExitAnimationFunction,
  LayoutAnimationFunction,
  SharedValue,
} from './commonTypes';
import type { NestedArray } from './createAnimatedComponent/commonTypes';
import type { CSSStyle } from './css';
import type { BaseAnimationBuilder } from './layoutReanimation/animationBuilder/BaseAnimationBuilder';
import type { ReanimatedKeyframe } from './layoutReanimation/animationBuilder/Keyframe';
import type { SharedTransition } from './layoutReanimation/SharedTransition';

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
type ComponentPropsWithoutStyle<Props extends object> = Omit<
  Props,
  keyof PickStyleProps<Props> | 'style'
>;

type RestProps<Props extends object> = {
  [K in keyof ComponentPropsWithoutStyle<Props>]:
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

type SharedTransitionProps = {
  sharedTransitionTag?: string;
  sharedTransitionStyle?: SharedTransition;
};

/**
 * Type representing what can be passed to animatedProps. Exported for use with
 * AnimatedComponentType.
 */
export type AnimatedPropsProp<Props extends object> = CSSStyle<
  ComponentPropsWithoutStyle<Partial<Props>>
>;

export type AnimatedProps<
  Props extends object,
  AP extends Partial<AnimatedPropsProp<Props>> = never,
> = [AP] extends [never]
  ? // Default: all props remain as-is
    RestProps<Props> &
      AnimatedStyleProps<Props> &
      LayoutProps &
      SharedTransitionProps & {
        /**
         * Lets you animate component props.
         *
         * @see https://docs.swmansion.com/react-native-reanimated/docs/core/useAnimatedProps
         */
        animatedProps?: NestedArray<AnimatedPropsProp<Props>>;
      }
  : // When AP is provided: props in AP become optional
    Omit<RestProps<Props>, keyof AP> &
      Partial<Pick<RestProps<Props>, keyof AP & keyof RestProps<Props>>> &
      Omit<AnimatedStyleProps<Props>, keyof AP> &
      Partial<
        Pick<
          AnimatedStyleProps<Props>,
          keyof AP & keyof AnimatedStyleProps<Props>
        >
      > &
      LayoutProps &
      SharedTransitionProps & {
        /**
         * Lets you animate component props.
         *
         * @see https://docs.swmansion.com/react-native-reanimated/docs/core/useAnimatedProps
         */
        animatedProps?: AP;
      };

/**
 * Props type when animatedProps is provided with a specific type. Props that
 * are keys of AP become optional.
 */
export type AnimatedPropsWithInference<
  Props extends object,
  AP extends object,
> = Omit<RestProps<Props>, keyof AP> &
  Partial<Pick<RestProps<Props>, keyof AP & keyof RestProps<Props>>> &
  Omit<AnimatedStyleProps<Props>, keyof AP> &
  Partial<
    Pick<AnimatedStyleProps<Props>, keyof AP & keyof AnimatedStyleProps<Props>>
  > &
  LayoutProps &
  SharedTransitionProps & {
    animatedProps: AP;
  };

// THE LAND OF THE DEPRECATED
