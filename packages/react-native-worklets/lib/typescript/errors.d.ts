import type { WorkletStackDetails } from './workletTypes';
export declare function registerWorkletStackDetails(hash: number, stackDetails: WorkletStackDetails): void;
export interface RNError extends Error {
    jsEngine: string;
}
/**
 * Remote error is an error coming from a Worklet Runtime that we bubble up to
 * the RN Runtime.
 */
export declare function reportFatalRemoteError({ message, stack, name, jsEngine }: RNError, force: boolean): void;
/**
 * Registers `reportFatalRemoteError` function in global scope to allow to
 * invoke it from C++.
 */
export declare function registerReportFatalRemoteError(): void;
//# sourceMappingURL=errors.d.ts.map