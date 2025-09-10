import type { StyleProp } from 'react-native';
import type { AnimatedStyle, EntryExitAnimationFunction, LayoutAnimationFunction, SharedValue } from './commonTypes';
import type { CSSStyle } from './css';
import type { AddArrayPropertyType } from './css/types';
import type { BaseAnimationBuilder } from './layoutReanimation/animationBuilder/BaseAnimationBuilder';
import type { ReanimatedKeyframe } from './layoutReanimation/animationBuilder/Keyframe';
export type EntryOrExitLayoutType = BaseAnimationBuilder | typeof BaseAnimationBuilder | EntryExitAnimationFunction | ReanimatedKeyframe;
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
    animatedProps?: AddArrayPropertyType<Partial<AnimatedPropsProp<Props>> | CSSStyle<Props>>;
};
export {};
//# sourceMappingURL=helperTypes.d.ts.map