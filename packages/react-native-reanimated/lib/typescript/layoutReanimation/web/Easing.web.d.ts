import type { EasingFunctionFactory } from '../../Easing';
export declare const WebEasings: {
    linear: number[];
    ease: number[];
    quad: number[];
    cubic: number[];
    sin: number[];
    circle: number[];
    exp: number[];
};
export declare function getEasingByName(easingName: WebEasingsNames): string;
export declare function maybeGetBezierEasing(easing: EasingFunctionFactory): null | string;
export type WebEasingsNames = keyof typeof WebEasings;
//# sourceMappingURL=Easing.web.d.ts.map