import type { SerializableRef } from './workletTypes';
/**
 * This symbol is used to represent a mapping from the value to itself.
 *
 * It's used to prevent converting a serializable that's already converted - for
 * example a Shared Value that's in worklet's closure.
 */
export declare const serializableMappingFlag: unique symbol;
export declare const serializableMappingCache: {
    set(): void;
    get(): null;
} | {
    set(serializable: object, serializableRef?: SerializableRef): void;
    get: (key: object) => symbol | SerializableRef | undefined;
};
//# sourceMappingURL=serializableMappingCache.d.ts.map