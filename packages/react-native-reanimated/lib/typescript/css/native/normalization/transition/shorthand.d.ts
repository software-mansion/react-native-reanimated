import type { ConvertValuesToArraysWithUndefined, CSSTransitionProperties } from '../../../types';
export type ExpandedCSSTransitionConfigProperties = Required<ConvertValuesToArraysWithUndefined<Omit<CSSTransitionProperties, 'transition' | 'transitionProperty'>>> & {
    transitionProperty: string[];
};
export declare const createEmptyTransitionConfig: () => ExpandedCSSTransitionConfigProperties;
export declare function parseTransitionShorthand(value: string): ExpandedCSSTransitionConfigProperties;
//# sourceMappingURL=shorthand.d.ts.map