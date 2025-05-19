import type { CSSAnimationKeyframes, CSSKeyframesRule, CSSStyle, PlainStyle } from './types';
type NamedStyles<T> = {
    [P in keyof T]: CSSStyle;
};
declare function keyframes<S extends PlainStyle>(keyframeDefinitions: CSSAnimationKeyframes<Pick<S, keyof PlainStyle>> & CSSAnimationKeyframes<PlainStyle>): CSSKeyframesRule;
declare const css: {
    create: <T extends NamedStyles<T>>(styles: T & NamedStyles<any>) => T;
    keyframes: typeof keyframes;
};
export { css };
//# sourceMappingURL=stylesheet.d.ts.map