import type { ILayoutAnimationBuilder, LayoutAnimationFunction } from '../../commonTypes';
import { BaseAnimationBuilder } from '../animationBuilder';
/**
 * Fades out components from one position and shows them in another. You can
 * modify the behavior by chaining methods like `.duration(500)` or
 * `.delay(500)`.
 *
 * You pass it to the `layout` prop on [an Animated
 * component](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#animated-component).
 *
 * @see https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/layout-transitions#fading-transition
 */
export declare class FadingTransition extends BaseAnimationBuilder implements ILayoutAnimationBuilder {
    static presetName: string;
    static createInstance<T extends typeof BaseAnimationBuilder>(this: T): InstanceType<T>;
    build: () => LayoutAnimationFunction;
}
//# sourceMappingURL=FadingTransition.d.ts.map