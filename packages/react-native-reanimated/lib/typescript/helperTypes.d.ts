import type { RegisteredStyle, StyleProp } from 'react-native';
import type { AnimatedStyle, EntryExitAnimationFunction, LayoutAnimationFunction, SharedValue, TransformArrayItem } from './commonTypes';
import type { BaseAnimationBuilder } from './layoutReanimation/animationBuilder/BaseAnimationBuilder';
import type { ReanimatedKeyframe } from './layoutReanimation/animationBuilder/Keyframe';
type EntryOrExitLayoutType = BaseAnimationBuilder | typeof BaseAnimationBuilder | EntryExitAnimationFunction | ReanimatedKeyframe;
type PickStyleProps<Props> = Pick<Props, {
    [Key in keyof Props]-?: Key extends `${string}Style` | 'style' ? Key : never;
}[keyof Props]>;
type AnimatedStyleProps<Props extends object> = {
    [Key in keyof PickStyleProps<Props>]: StyleProp<AnimatedStyle<Props[Key]>>;
};
/** Component props that are not specially handled by us. */
type RestProps<Props extends object> = {
    [K in keyof Omit<Props, keyof PickStyleProps<Props> | 'style'>]: Props[K] | SharedValue<Props[K]>;
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
    layout?: BaseAnimationBuilder | LayoutAnimationFunction | typeof BaseAnimationBuilder;
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
type AnimatedPropsProp<Props extends object> = RestProps<Props> & AnimatedStyleProps<Props> & LayoutProps;
export type AnimatedProps<Props extends object> = RestProps<Props> & AnimatedStyleProps<Props> & LayoutProps & {
    /**
     * Lets you animate component props.
     *
     * @see https://docs.swmansion.com/react-native-reanimated/docs/core/useAnimatedProps
     */
    animatedProps?: Partial<AnimatedPropsProp<Props>>;
};
/** @deprecated This type is no longer relevant. */
export type Adaptable<T> = T | ReadonlyArray<T | ReadonlyArray<T>> | SharedValue<T>;
/** @deprecated This type is no longer relevant. */
export type AdaptTransforms<T> = {
    [P in keyof T]: Adaptable<T[P]>;
};
/** @deprecated Please use {@link TransformArrayItem} type instead. */
export type TransformStyleTypes = TransformArrayItem;
/** @deprecated This type is no longer relevant. */
export type AnimatedStyleProp<T> = AnimatedStyle<T> | RegisteredStyle<AnimatedStyle<T>>;
/** @deprecated Please use {@link AnimatedProps} type instead. */
export type AnimateProps<Props extends object> = AnimatedProps<Props>;
export {};
//# sourceMappingURL=helperTypes.d.ts.map