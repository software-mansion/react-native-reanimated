import type { FlatSerializableRef, SerializableRef } from './workletTypes';
export declare function isSerializableRef(value: unknown): value is SerializableRef;
interface CreateSerializable {
    <T>(value: T): SerializableRef<T>;
    <T>(value: T, shouldPersistRemote: boolean, depth: number): SerializableRef<T>;
}
export declare const createSerializable: CreateSerializable;
declare function makeShareableCloneOnUIRecursiveLEGACY<T>(value: T): FlatSerializableRef<T>;
/** @deprecated This function is no longer supported. */
export declare const makeShareableCloneOnUIRecursive: typeof makeShareableCloneOnUIRecursiveLEGACY;
declare function makeShareableNative<T extends object>(value: T): T;
/**
 * This function creates a value on UI with persistent state - changes to it on
 * the UI thread will be seen by all worklets. Use it when you want to create a
 * value that is read and written only on the UI thread.
 */
/** @deprecated This function is no longer supported. */
export declare const makeShareable: typeof makeShareableNative;
export {};
//# sourceMappingURL=serializable.d.ts.map