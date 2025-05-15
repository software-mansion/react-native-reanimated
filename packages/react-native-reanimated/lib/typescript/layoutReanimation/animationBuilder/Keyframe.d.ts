import type { ValidKeyframeProps } from '../../commonTypes';
import { ReduceMotion } from '../../commonTypes';
export declare class ReanimatedKeyframe {
    constructor(definitions: ValidKeyframeProps);
    duration(durationMs: number): ReanimatedKeyframe;
    delay(delayMs: number): ReanimatedKeyframe;
    reduceMotion(reduceMotionV: ReduceMotion): ReanimatedKeyframe;
    withCallback(callback: (finished: boolean) => void): ReanimatedKeyframe;
}
export declare const Keyframe: typeof ReanimatedKeyframe;
//# sourceMappingURL=Keyframe.d.ts.map