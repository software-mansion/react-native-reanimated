import type { WorkletFunction } from './workletTypes';
export declare function bundleValueUnpacker(objectToUnpack: ObjectToUnpack, category?: string, remoteFunctionName?: string): unknown;
interface ObjectToUnpack extends WorkletFunction {
    _recur: unknown;
}
export {};
//# sourceMappingURL=bundleUnpacker.d.ts.map