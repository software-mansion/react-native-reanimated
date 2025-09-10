declare global {
    var evalWithSourceMap: ((js: string, sourceURL: string, sourceMap: string) => () => unknown) | undefined;
    var evalWithSourceUrl: ((js: string, sourceURL: string) => () => unknown) | undefined;
}
export {};
//# sourceMappingURL=valueUnpacker.d.ts.map