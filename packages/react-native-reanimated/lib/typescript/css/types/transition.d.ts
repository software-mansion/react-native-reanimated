import type { CSSTimingFunction } from '../easing';
import type { PlainStyle, TimeUnit } from './common';
import type { AddArrayPropertyTypes } from './helpers';
export type CSSTransitionProperty<S extends object = PlainStyle> = 'all' | 'none' | keyof S | ('all' | keyof S)[];
export type CSSTransitionDuration = TimeUnit;
export type CSSTransitionTimingFunction = CSSTimingFunction;
export type CSSTransitionDelay = TimeUnit;
export type CSSTransitionBehavior = 'normal' | 'allow-discrete';
export type CSSTransitionShorthand = string;
type SingleCSSTransitionSettings = {
    transitionDuration?: CSSTransitionDuration;
    transitionTimingFunction?: CSSTransitionTimingFunction;
    transitionDelay?: CSSTransitionDelay;
    transitionBehavior?: CSSTransitionBehavior;
};
export type SingleCSSTransitionConfig<S extends object = PlainStyle> = SingleCSSTransitionSettings & {
    transitionProperty?: CSSTransitionProperty<S>;
};
export type CSSTransitionSettings = AddArrayPropertyTypes<SingleCSSTransitionSettings>;
export type CSSTransitionProperties<S extends object = PlainStyle> = CSSTransitionSettings & {
    transitionProperty?: CSSTransitionProperty<S>;
    transition?: CSSTransitionShorthand;
};
export type CSSTransitionProp = keyof CSSTransitionProperties;
export {};
//# sourceMappingURL=transition.d.ts.map