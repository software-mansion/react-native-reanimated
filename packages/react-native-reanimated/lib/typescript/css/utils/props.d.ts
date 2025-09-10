import type { AnyRecord, CSSStyle, CSSTransitionProperties, ExistingCSSAnimationProperties, PlainStyle } from '../types';
export declare function filterCSSAndStyleProperties<S extends AnyRecord>(style: CSSStyle<S>): [
    ExistingCSSAnimationProperties | null,
    CSSTransitionProperties | null,
    PlainStyle
];
//# sourceMappingURL=props.d.ts.map