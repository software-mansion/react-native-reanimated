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
//# sourceMappingURL=EntryExitTransition.d.ts.map