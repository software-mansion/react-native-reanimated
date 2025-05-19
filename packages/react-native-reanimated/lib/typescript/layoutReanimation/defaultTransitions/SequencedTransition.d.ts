import type { ILayoutAnimationBuilder, LayoutAnimationFunction } from '../../commonTypes';
import { BaseAnimationBuilder } from '../animationBuilder';
/**
 * Transforms layout starting from the X-axis and width first, followed by the
 * Y-axis and height. You can modify the behavior by chaining methods like
 * `.springify()` or `.duration(500)`.
 *
 * You pass it to the `layout` prop on [an Animated
 * component](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#animated-component).
 *
 * @see https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/layout-transitions#sequenced-transition
 */
export declare class SequencedTransition extends BaseAnimationBuilder implements ILayoutAnimationBuilder {
    static presetName: string;
    reversed: boolean;
    static createInstance<T extends typeof BaseAnimationBuilder>(this: T): InstanceType<T>;
    static reverse(): SequencedTransition;
    reverse(): SequencedTransition;
    build: () => LayoutAnimationFunction;
}
//# sourceMappingURL=SequencedTransition.d.ts.map