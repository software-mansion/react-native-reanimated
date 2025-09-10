import type { AnimationFunction, EntryExitAnimationFunction, LayoutAnimationFunction } from '../../commonTypes';
import { ReduceMotion } from '../../commonTypes';
export declare class BaseAnimationBuilder {
    durationV?: number;
    delayV?: number;
    reduceMotionV: ReduceMotion;
    randomizeDelay: boolean;
    callbackV?: (finished: boolean) => void;
    static createInstance: <T extends typeof BaseAnimationBuilder>(this: T) => InstanceType<T>;
    build: () => EntryExitAnimationFunction | LayoutAnimationFunction;
    /**
     * Lets you adjust the animation duration. Can be chained alongside other
     * [layout animation
     * modifiers](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#layout-animation-modifier).
     *
     * @param durationMs - Length of the animation (in milliseconds).
     */
    static duration<T extends typeof BaseAnimationBuilder>(this: T, durationMs: number): InstanceType<T>;
    duration(durationMs: number): this;
    /**
     * Lets you adjust the delay before the animation starts (in milliseconds).
     * Can be chained alongside other [layout animation
     * modifiers](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#layout-animation-modifier).
     *
     * @param delayMs - Delay before the animation starts (in milliseconds).
     */
    static delay<T extends typeof BaseAnimationBuilder>(this: T, delayMs: number): InstanceType<T>;
    delay(delayMs: number): this;
    /**
     * The callback that will fire after the animation ends. Can be chained
     * alongside other [layout animation
     * modifiers](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#layout-animation-modifier).
     *
     * @param callback - Callback that will fire after the animation ends.
     */
    static withCallback<T extends typeof BaseAnimationBuilder>(this: T, callback: (finished: boolean) => void): InstanceType<T>;
    withCallback(callback: (finished: boolean) => void): this;
    /**
     * Lets you adjust the behavior when the device's reduced motion accessibility
     * setting is turned on. Can be chained alongside other [layout animation
     * modifiers](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#layout-animation-modifier).
     *
     * @param reduceMotion - Determines how the animation responds to the device's
     *   reduced motion accessibility setting. Default to `ReduceMotion.System` -
     *   {@link ReduceMotion}.
     */
    static reduceMotion<T extends typeof BaseAnimationBuilder>(this: T, reduceMotion: ReduceMotion): InstanceType<T>;
    reduceMotion(reduceMotionV: ReduceMotion): this;
    static getDuration(): number;
    getDuration(): number;
    /** @deprecated Use `.delay()` with `Math.random()` instead */
    static randomDelay<T extends typeof BaseAnimationBuilder>(this: T): InstanceType<T>;
    randomDelay(): this;
    getDelay(): number;
    getReduceMotion(): ReduceMotion;
    getDelayFunction(): AnimationFunction;
    static build<T extends typeof BaseAnimationBuilder>(this: T): EntryExitAnimationFunction | LayoutAnimationFunction;
}
//# sourceMappingURL=BaseAnimationBuilder.d.ts.map