import type { SingleCSSTransitionConfig } from '../types';
export declare function splitByComma(str: string): string[];
export declare function splitByWhitespace(str: string): string[];
type ParsedShorthandSingleTransitionConfig = Omit<SingleCSSTransitionConfig, 'transitionProperty' | 'transitionTimingFunction'> & {
    transitionProperty?: string;
    transitionTimingFunction?: string;
};
export declare function parseSingleTransitionShorthand(value: string): ParsedShorthandSingleTransitionConfig;
export {};
//# sourceMappingURL=parsers.d.ts.map