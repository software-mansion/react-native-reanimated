import type { AnimationConfigFunction, EntryAnimationsValues, ExitAnimationsValues, IEntryAnimationBuilder, IExitAnimationBuilder } from '../../commonTypes';
import type { BaseAnimationBuilder } from '../animationBuilder';
import { ComplexAnimationBuilder } from '../animationBuilder';
/**
 * Slide from right animation. You can modify the behavior by chaining methods
 * like `.springify()` or `.duration(500)`.
 *
 * You pass it to the `entering` prop on [an Animated
 * component](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#animated-component).
 *
 * @see https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/entering-exiting-animations#slide
 */
export declare class SlideInRight extends ComplexAnimationBuilder implements IEntryAnimationBuilder {
    static presetName: string;
    static createInstance<T extends typeof BaseAnimationBuilder>(this: T): InstanceType<T>;
    build: () => AnimationConfigFunction<EntryAnimationsValues>;
}
/**
 * Slide from left animation. You can modify the behavior by chaining methods
 * like `.springify()` or `.duration(500)`.
 *
 * You pass it to the `entering` prop on [an Animated
 * component](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#animated-component).
 *
 * @see https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/entering-exiting-animations#slide
 */
export declare class SlideInLeft extends ComplexAnimationBuilder implements IEntryAnimationBuilder {
    static presetName: string;
    static createInstance<T extends typeof BaseAnimationBuilder>(this: T): InstanceType<T>;
    build: () => AnimationConfigFunction<EntryAnimationsValues>;
}
/**
 * Slide to right animation. You can modify the behavior by chaining methods
 * like `.springify()` or `.duration(500)`.
 *
 * You pass it to the `exiting` prop on [an Animated
 * component](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#animated-component).
 *
 * @see https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/entering-exiting-animations#slide
 */
export declare class SlideOutRight extends ComplexAnimationBuilder implements IExitAnimationBuilder {
    static presetName: string;
    static createInstance<T extends typeof BaseAnimationBuilder>(this: T): InstanceType<T>;
    build: () => AnimationConfigFunction<ExitAnimationsValues>;
}
/**
 * Slide to left animation. You can modify the behavior by chaining methods like
 * `.springify()` or `.duration(500)`.
 *
 * You pass it to the `exiting` prop on [an Animated
 * component](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#animated-component).
 *
 * @see https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/entering-exiting-animations#slide
 */
export declare class SlideOutLeft extends ComplexAnimationBuilder implements IExitAnimationBuilder {
    static presetName: string;
    static createInstance<T extends typeof BaseAnimationBuilder>(this: T): InstanceType<T>;
    build: () => AnimationConfigFunction<ExitAnimationsValues>;
}
/**
 * Slide from top animation. You can modify the behavior by chaining methods
 * like `.springify()` or `.duration(500)`.
 *
 * You pass it to the `entering` prop on [an Animated
 * component](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#animated-component).
 *
 * @see https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/entering-exiting-animations#slide
 */
export declare class SlideInUp extends ComplexAnimationBuilder implements IEntryAnimationBuilder {
    static presetName: string;
    static createInstance<T extends typeof BaseAnimationBuilder>(this: T): InstanceType<T>;
    build: () => AnimationConfigFunction<EntryAnimationsValues>;
}
/**
 * Slide from bottom animation. You can modify the behavior by chaining methods
 * like `.springify()` or `.duration(500)`.
 *
 * You pass it to the `entering` prop on [an Animated
 * component](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#animated-component).
 *
 * @see https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/entering-exiting-animations#slide
 */
export declare class SlideInDown extends ComplexAnimationBuilder implements IEntryAnimationBuilder {
    static presetName: string;
    static createInstance<T extends typeof BaseAnimationBuilder>(this: T): InstanceType<T>;
    build: () => AnimationConfigFunction<EntryAnimationsValues>;
}
/**
 * Slide to top animation. You can modify the behavior by chaining methods like
 * `.springify()` or `.duration(500)`.
 *
 * You pass it to the `exiting` prop on [an Animated
 * component](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#animated-component).
 *
 * @see https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/entering-exiting-animations#slide
 */
export declare class SlideOutUp extends ComplexAnimationBuilder implements IExitAnimationBuilder {
    static presetName: string;
    static createInstance<T extends typeof BaseAnimationBuilder>(this: T): InstanceType<T>;
    build: () => AnimationConfigFunction<ExitAnimationsValues>;
}
/**
 * Slide to bottom animation. You can modify the behavior by chaining methods
 * like `.springify()` or `.duration(500)`.
 *
 * You pass it to the `exiting` prop on [an Animated
 * component](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#animated-component).
 *
 * @see https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/entering-exiting-animations#slide
 */
export declare class SlideOutDown extends ComplexAnimationBuilder implements IExitAnimationBuilder {
    static presetName: string;
    static createInstance<T extends typeof BaseAnimationBuilder>(this: T): InstanceType<T>;
    build: () => AnimationConfigFunction<ExitAnimationsValues>;
}
//# sourceMappingURL=Slide.d.ts.map