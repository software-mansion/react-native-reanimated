import type { StyleProps } from '../commonTypes';
import type { CSSStyle } from '../css';
import type { NestedArray } from './commonTypes';
export declare function flattenArray<T>(array: NestedArray<T>): T[];
export declare const has: <K extends string>(key: K, x: unknown) => x is { [key in K]: unknown; };
export declare function filterStyles(styles: StyleProps[] | undefined): {
    cssStyle: CSSStyle;
    animatedStyles: StyleProps[];
};
//# sourceMappingURL=utils.d.ts.map