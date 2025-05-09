import type { WorkletStackDetails } from './workletTypes';
export declare function registerWorkletStackDetails(hash: number, stackDetails: WorkletStackDetails): void;
export declare function reportFatalErrorOnJS({ message, stack, moduleName, }: {
    message: string;
    stack?: string;
    moduleName: string;
}): void;
//# sourceMappingURL=errors.d.ts.map