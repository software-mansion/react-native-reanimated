type withClampType = <T extends number | string>(config: {
    min?: T;
    max?: T;
}, clampedAnimation: T) => T;
export declare const withClamp: withClampType;
export {};
//# sourceMappingURL=clamp.d.ts.map