import type { ILayoutAnimationBuilder, LayoutAnimationFunction } from '../../commonTypes';
import type { BaseAnimationBuilder } from '../animationBuilder';
import { ComplexAnimationBuilder } from '../animationBuilder';
/**
 * Linearly transforms the layout from one position to another. You can modify
 * the behavior by chaining methods like `.springify()` or `.duration(500)`.
 *
 * You pass it to the `layout` prop on [an Animated
 * component](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#animated-component).
 *
 * @see https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/layout-transitions#linear-transition
 */
export declare class LinearTransition extends ComplexAnimationBuilder implements ILayoutAnimationBuilder {
    static presetName: string;
    static createInstance<T extends typeof BaseAnimationBuilder>(this: T): InstanceType<T>;
    build: () => LayoutAnimationFunction;
}
/** @deprecated Please use {@link LinearTransition} instead. */
export declare const Layout: typeof LinearTransition;
//# sourceMappingURL=LinearTransition.d.ts.map