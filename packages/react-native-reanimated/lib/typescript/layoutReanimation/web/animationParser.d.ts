import type { EasingFunction } from '../../commonTypes';
import type { EasingFunctionFactory } from '../../Easing';
export interface ReanimatedWebTransformProperties {
    translateX?: string;
    translateY?: string;
    rotate?: string;
    rotateX?: string;
    rotateY?: string;
    scale?: number | string;
    scaleX?: number;
    scaleY?: number;
    perspective?: string;
    skew?: string;
    skewX?: string;
}
export interface AnimationStyle {
    opacity?: number;
    transform?: ReanimatedWebTransformProperties[];
    easing?: EasingFunction | EasingFunctionFactory;
}
export interface AnimationData {
    name: string;
    style: Record<number, AnimationStyle>;
    duration: number;
}
export interface TransitionData {
    translateX: number;
    translateY: number;
    scaleX: number;
    scaleY: number;
    reversed?: boolean;
    easingX?: string;
    easingY?: string;
    entering?: any;
    exiting?: any;
}
export declare function convertAnimationObjectToKeyframes(animationObject: AnimationData): string;
//# sourceMappingURL=animationParser.d.ts.map