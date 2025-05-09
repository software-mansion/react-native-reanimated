/**
 * Registers WorkletsError in the global scope. Register only for Worklet
 * runtimes.
 */
export declare function registerWorkletsError(): void;
export declare const WorkletsError: IWorkletsErrorConstructor;
export type WorkletsError = Error & {
    name: 'Worklets';
};
export interface IWorkletsErrorConstructor extends Error {
    new (message?: string): WorkletsError;
    (message?: string): WorkletsError;
    readonly prototype: WorkletsError;
}
//# sourceMappingURL=WorkletsError.d.ts.map