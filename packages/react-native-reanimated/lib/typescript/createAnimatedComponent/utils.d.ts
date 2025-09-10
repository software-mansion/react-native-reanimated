import type { StyleProps } from '../commonTypes';
import type { CSSStyle } from '../css';
import type { NestedArray } from './commonTypes';
export declare function flattenArray<T>(array: NestedArray<T>): T[];
export declare const has: <K extends string>(key: K, x: unknown) => x is { [key in K]: unknown; };
type FilteredStyles = {
    cssStyle: CSSStyle | null;
    animatedStyles: StyleProps[];
};
export declare function filterStyles(styles: StyleProps[] | undefined): FilteredStyles;
export {};
//# sourceMappingURL=utils.d.ts.map