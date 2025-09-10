import type { SerializableRef } from './workletTypes';
export declare function createSynchronizable<TValue>(initialValue: TValue): Synchronizable<TValue>;
export type SynchronizableRef<TValue = unknown> = {
    __synchronizableRef: true;
    __nativeStateSynchronizableJSRef: TValue;
};
export type Synchronizable<TValue = unknown> = SerializableRef<TValue> & SynchronizableRef<TValue> & {
    __synchronizableRef: true;
    getDirty(): TValue;
    getBlocking(): TValue;
    setBlocking(value: TValue | ((prev: TValue) => TValue)): void;
    lock(): void;
    unlock(): void;
};
//# sourceMappingURL=synchronizable.d.ts.map