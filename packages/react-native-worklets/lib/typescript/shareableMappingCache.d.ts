import type { ShareableRef } from './workletTypes';
/**
 * This symbol is used to represent a mapping from the value to itself.
 *
 * It's used to prevent converting a shareable that's already converted - for
 * example a Shared Value that's in worklet's closure.
 */
export declare const shareableMappingFlag: unique symbol;
export declare const shareableMappingCache: {
    set(): void;
    get(): null;
} | {
    set(shareable: object, shareableRef?: ShareableRef): void;
    get: (key: object) => symbol | ShareableRef | undefined;
};
//# sourceMappingURL=shareableMappingCache.d.ts.map