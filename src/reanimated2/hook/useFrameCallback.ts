'use strict';
import { useEffect, useRef } from 'react';
import FrameCallbackRegistryJS from '../frameCallback/FrameCallbackRegistryJS';
import type { FrameInfo } from '../frameCallback/FrameCallbackRegistryUI';

/**
 * @param setActive - A function that lets you start the frame callback or stop it from running.
 * @param isActive - A boolean indicating whether a callback is running.
 * @param callbackId - A number indicating a unique identifier of the frame callback.
 * @see https://docs.swmansion.com/react-native-reanimated/docs/advanced/useFrameCallback#returns
 */
export type FrameCallback = {
  setActive: (isActive: boolean) => void;
  isActive: boolean;
  callbackId: number;
};
const frameCallbackRegistry = new FrameCallbackRegistryJS();

/**
 * Lets you run a function on every frame update.
 *
 * @param callback - A function executed on every frame update.
 * @param autostart - Whether the callback should start automatically. Defaults to `true`.
 * @returns A frame callback object - {@link FrameCallback}.
 * @see https://docs.swmansion.com/react-native-reanimated/docs/advanced/useFrameCallback
 */
export function useFrameCallback(
  callback: (frameInfo: FrameInfo) => void,
  autostart = true
): FrameCallback {
  const ref = useRef<FrameCallback>({
    setActive: (isActive: boolean) => {
      frameCallbackRegistry.manageStateFrameCallback(
        ref.current.callbackId,
        isActive
      );
      ref.current.isActive = isActive;
    },
    isActive: autostart,
    callbackId: -1,
  });

  useEffect(() => {
    ref.current.callbackId =
      frameCallbackRegistry.registerFrameCallback(callback);
    ref.current.setActive(ref.current.isActive);

    return () => {
      frameCallbackRegistry.unregisterFrameCallback(ref.current.callbackId);
      ref.current.callbackId = -1;
    };
  }, [callback, autostart]);

  return ref.current;
}
