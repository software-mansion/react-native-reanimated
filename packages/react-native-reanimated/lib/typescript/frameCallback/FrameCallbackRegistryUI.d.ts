type CallbackDetails = {
    callback: (frameInfo: FrameInfo) => void;
    startTime: number | null;
};
export type FrameInfo = {
    timestamp: number;
    timeSincePreviousFrame: number | null;
    timeSinceFirstFrame: number;
};
export interface FrameCallbackRegistryUI {
    frameCallbackRegistry: Map<number, CallbackDetails>;
    activeFrameCallbacks: Set<number>;
    previousFrameTimestamp: number | null;
    runCallbacks: (callId: number) => void;
    nextCallId: number;
    registerFrameCallback: (callback: (frameInfo: FrameInfo) => void, callbackId: number) => void;
    unregisterFrameCallback: (callbackId: number) => void;
    manageStateFrameCallback: (callbackId: number, state: boolean) => void;
}
export declare const prepareUIRegistry: () => void;
export {};
//# sourceMappingURL=FrameCallbackRegistryUI.d.ts.map