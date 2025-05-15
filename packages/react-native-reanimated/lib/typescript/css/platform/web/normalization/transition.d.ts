import type { CSSTransitionProp, CSSTransitionProperties } from '../../../types';
type ExpandedCSSTransitionConfigProperties = Record<Exclude<CSSTransitionProp, 'transition'>, string[]>;
export declare function normalizeCSSTransitionProperties(config: CSSTransitionProperties): ExpandedCSSTransitionConfigProperties;
export {};
//# sourceMappingURL=transition.d.ts.map