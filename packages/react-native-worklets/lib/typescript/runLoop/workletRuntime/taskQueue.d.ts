type Callback = () => void;
export type Queue = {
    microtasks: Array<Callback>;
    timeoutCallbacks: Map<number, Callback>;
};
export declare function setupTaskQueue(): void;
export declare function pushMicrotask(callback: Callback): void;
export declare function pushTask(callback: Callback, handlerId: number, delay: number): void;
export {};
//# sourceMappingURL=taskQueue.d.ts.map