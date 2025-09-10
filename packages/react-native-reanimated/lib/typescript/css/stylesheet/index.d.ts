import keyframes from './keyframes';
export declare const css: {
    create: <T extends { [P in keyof T]: import("..").CSSStyle; }>(styles: T & {
        [x: string]: import("..").CSSStyle;
    }) => T;
    keyframes: typeof keyframes;
};
//# sourceMappingURL=index.d.ts.map