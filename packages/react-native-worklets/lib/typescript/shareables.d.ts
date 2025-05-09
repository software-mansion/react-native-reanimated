import type { FlatShareableRef, ShareableRef } from './workletTypes';
export interface MakeShareableClone {
    <T>(value: T, shouldPersistRemote?: boolean, depth?: number): ShareableRef<T>;
}
export declare const makeShareableCloneRecursive: MakeShareableClone;
export declare function makeShareableCloneOnUIRecursive<T>(value: T): FlatShareableRef<T>;
declare function makeShareableJS<T extends object>(value: T): T;
/**
 * This function creates a value on UI with persistent state - changes to it on
 * the UI thread will be seen by all worklets. Use it when you want to create a
 * value that is read and written only on the UI thread.
 */
export declare const makeShareable: typeof makeShareableJS;
export {};
//# sourceMappingURL=shareables.d.ts.map