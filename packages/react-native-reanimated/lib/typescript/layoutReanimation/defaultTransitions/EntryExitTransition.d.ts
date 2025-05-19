import type { ILayoutAnimationBuilder, LayoutAnimationFunction } from '../../commonTypes';
import { BaseAnimationBuilder } from '../animationBuilder';
export declare class EntryExitTransition extends BaseAnimationBuilder implements ILayoutAnimationBuilder {
    static presetName: string;
    enteringV: BaseAnimationBuilder | typeof BaseAnimationBuilder;
    exitingV: BaseAnimationBuilder | typeof BaseAnimationBuilder;
    static createInstance<T extends typeof BaseAnimationBuilder>(this: T): InstanceType<T>;
    static entering(animation: BaseAnimationBuilder | typeof BaseAnimationBuilder): EntryExitTransition;
    entering(animation: BaseAnimationBuilder | typeof BaseAnimationBuilder): EntryExitTransition;
    static exiting(animation: BaseAnimationBuilder | typeof BaseAnimationBuilder): EntryExitTransition;
    exiting(animation: BaseAnimationBuilder | typeof BaseAnimationBuilder): EntryExitTransition;
    build: () => LayoutAnimationFunction;
}
/**
 * @deprecated Please use
 *   `EntryExitTransition.entering(entering).exiting(exiting)` instead.
 * @see https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/layout-transitions
 */
export declare function combineTransition(exiting: BaseAnimationBuilder | typeof BaseAnimationBuilder, entering: BaseAnimationBuilder | typeof BaseAnimationBuilder): EntryExitTransition;
//# sourceMappingURL=EntryExitTransition.d.ts.map