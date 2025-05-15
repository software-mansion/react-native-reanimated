/**
 * Registers ReanimatedError in the global scope. Register only for Worklet
 * runtimes.
 */
export declare function registerReanimatedError(): void;
export declare const ReanimatedError: IReanimatedErrorConstructor;
export interface IReanimatedErrorConstructor extends Error {
    new (message?: string): ReanimatedError;
    (message?: string): ReanimatedError;
    readonly prototype: ReanimatedError;
}
export type ReanimatedError = Error & {
    name: 'Reanimated';
};
//# sourceMappingURL=errors.d.ts.map