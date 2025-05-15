import type { CSSTransitionProperties, CSSTransitionProperty } from '../../../../types';
import type { NormalizedCSSTransitionConfig, NormalizedCSSTransitionConfigUpdates } from '../../types';
export declare const ERROR_MESSAGES: {
    invalidTransitionProperty: (transitionProperty: CSSTransitionProperty | undefined | string[]) => string;
};
export declare function normalizeCSSTransitionProperties(config: CSSTransitionProperties): NormalizedCSSTransitionConfig | null;
export declare function getNormalizedCSSTransitionConfigUpdates(oldConfig: NormalizedCSSTransitionConfig, newConfig: NormalizedCSSTransitionConfig): NormalizedCSSTransitionConfigUpdates;
//# sourceMappingURL=config.d.ts.map