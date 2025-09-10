import type { StyleProp } from 'react-native';
import type { CSSAnimationProperties } from './animation';
import type { PlainStyle } from './common';
import type { AnyRecord } from './helpers';
import type { CSSTransitionProperties } from './transition';
type PickStyleProps<P> = Pick<P, {
    [K in keyof P]-?: K extends `${string}Style` | 'style' ? K : never;
}[keyof P]>;
export type CSSStyle<S extends AnyRecord = PlainStyle> = S & Partial<CSSAnimationProperties<S>> & Partial<CSSTransitionProperties<S>>;
type CSSStyleProps<P extends object> = {
    [K in keyof PickStyleProps<P>]: P[K] extends StyleProp<infer U> ? U extends object ? StyleProp<CSSStyle<U>> : never : never;
};
type RestProps<P extends object> = {
    [K in keyof Omit<P, keyof PickStyleProps<P>>]: P[K];
};
export type CSSProps<P extends object> = CSSStyleProps<P> & RestProps<P>;
export {};
//# sourceMappingURL=props.d.ts.map