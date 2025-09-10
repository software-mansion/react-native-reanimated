import { isSerializableRef, makeShareable, makeShareableCloneOnUIRecursive } from './serializable';
import type { SerializableRef } from './workletTypes';
/** @deprecated Use {@link SerializableRef} instead. */
export type ShareableRef<T> = SerializableRef<T>;
export { makeShareable, makeShareableCloneOnUIRecursive };
/** @deprecated It will be removed in the next major version. */
export type MakeShareableClone = <T>(value: T, shouldPersistRemote?: boolean, depth?: number) => ShareableRef<T>;
/** @deprecated Use {@link createSerializable} instead. */
export declare const makeShareableCloneRecursive: MakeShareableClone;
/** @deprecated Use {@link isSerializableRef} instead. */
export declare const isShareableRef: typeof isSerializableRef;
/** @deprecated Use {@link serializableMappingCache} instead. */
export declare const shareableMappingCache: {
    set(): void;
    get(): null;
} | {
    set(serializable: object, serializableRef?: SerializableRef): void;
    get: (key: object) => symbol | SerializableRef | undefined;
};
//# sourceMappingURL=deprecated.d.ts.map