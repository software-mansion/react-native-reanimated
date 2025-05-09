type ReanimatedError = Error & 'ReanimatedError';
interface ReanimatedErrorConstructor extends Error {
    new (message?: string): ReanimatedError;
    (message?: string): ReanimatedError;
    readonly prototype: ReanimatedError;
}
declare const ReanimatedErrorConstructor: ReanimatedErrorConstructor;
export { ReanimatedErrorConstructor as ReanimatedError };
//# sourceMappingURL=errors.d.ts.map