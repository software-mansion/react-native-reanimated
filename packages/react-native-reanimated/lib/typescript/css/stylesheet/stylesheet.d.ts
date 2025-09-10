import type { CSSStyle } from '../types';
type NamedStyles<T> = {
    [P in keyof T]: CSSStyle;
};
export declare const create: <T extends NamedStyles<T>>(styles: T & NamedStyles<any>) => T;
export {};
//# sourceMappingURL=stylesheet.d.ts.map