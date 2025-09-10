import type { FrameInfo } from './FrameCallbackRegistryUI';
export default class FrameCallbackRegistryJS {
    private nextCallbackId;
    constructor();
    registerFrameCallback(callback: (frameInfo: FrameInfo) => void): number;
    unregisterFrameCallback(callbackId: number): void;
    manageStateFrameCallback(callbackId: number, state: boolean): void;
}
//# sourceMappingURL=FrameCallbackRegistryJS.d.ts.map