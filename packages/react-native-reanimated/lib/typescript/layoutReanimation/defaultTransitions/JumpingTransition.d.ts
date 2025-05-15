import type { ILayoutAnimationBuilder, LayoutAnimationFunction } from '../../commonTypes';
import { BaseAnimationBuilder } from '../animationBuilder';
/**
 * Layout jumps - quite literally - from one position to another. You can modify
 * the behavior by chaining methods like `.springify()` or `.duration(500)`.
 *
 * You pass it to the `layout` prop on [an Animated
 * component](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#animated-component).
 *
 * @see https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/layout-transitions#jumping-transition
 */
export declare class JumpingTransition extends BaseAnimationBuilder implements ILayoutAnimationBuilder {
    static presetName: string;
    static createInstance<T extends typeof BaseAnimationBuilder>(this: T): InstanceType<T>;
    build: () => LayoutAnimationFunction;
}
//# sourceMappingURL=JumpingTransition.d.ts.map