import type { EasingFunction, ILayoutAnimationBuilder, LayoutAnimationFunction } from '../../commonTypes';
import type { EasingFunctionFactory } from '../../Easing';
import { BaseAnimationBuilder } from '../animationBuilder';
/**
 * Layout transitions with a curved animation. You can modify the behavior by
 * chaining methods like `.duration(500)` or `.delay(500)`.
 *
 * You pass it to the `layout` prop on [an Animated
 * component](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#animated-component).
 *
 * @see https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/layout-transitions#fading-transition
 */
export declare class CurvedTransition extends BaseAnimationBuilder implements ILayoutAnimationBuilder {
    static presetName: string;
    easingXV: EasingFunction | EasingFunctionFactory;
    easingYV: EasingFunction | EasingFunctionFactory;
    easingWidthV: EasingFunction | EasingFunctionFactory;
    easingHeightV: EasingFunction | EasingFunctionFactory;
    static createInstance<T extends typeof BaseAnimationBuilder>(this: T): InstanceType<T>;
    static easingX(easing: EasingFunction | EasingFunctionFactory): CurvedTransition;
    easingX(easing: EasingFunction | EasingFunctionFactory): CurvedTransition;
    static easingY(easing: EasingFunction | EasingFunctionFactory): CurvedTransition;
    easingY(easing: EasingFunction | EasingFunctionFactory): CurvedTransition;
    static easingWidth(easing: EasingFunction | EasingFunctionFactory): CurvedTransition;
    easingWidth(easing: EasingFunction | EasingFunctionFactory): CurvedTransition;
    static easingHeight(easing: EasingFunction | EasingFunctionFactory): CurvedTransition;
    easingHeight(easing: EasingFunction | EasingFunctionFactory): CurvedTransition;
    build: () => LayoutAnimationFunction;
}
//# sourceMappingURL=CurvedTransition.d.ts.map