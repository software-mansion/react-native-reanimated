import type { FrameInfo } from '../frameCallback/FrameCallbackRegistryUI';
/**
 * @param setActive - A function that lets you start the frame callback or stop
 *   it from running.
 * @param isActive - A boolean indicating whether a callback is running.
 * @param callbackId - A number indicating a unique identifier of the frame
 *   callback.
 * @see https://docs.swmansion.com/react-native-reanimated/docs/advanced/useFrameCallback#returns
 */
export type FrameCallback = {
    setActive: (isActive: boolean) => void;
    isActive: boolean;
    callbackId: number;
};
/**
 * Lets you run a function on every frame update.
 *
 * @param callback - A function executed on every frame update.
 * @param autostart - Whether the callback should start automatically. Defaults
 *   to `true`.
 * @returns A frame callback object - {@link FrameCallback}.
 * @see https://docs.swmansion.com/react-native-reanimated/docs/advanced/useFrameCallback
 */
export declare function useFrameCallback(callback: (frameInfo: FrameInfo) => void, autostart?: boolean): FrameCallback;
//# sourceMappingURL=useFrameCallback.d.ts.map