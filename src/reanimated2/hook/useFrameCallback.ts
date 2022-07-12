import { useEffect, useRef } from 'react';
import NativeReanimated from '../NativeReanimated';

export type FrameCallback = {
  start: () => void;
  stop: () => void;
  state: boolean;
  callbackId: number;
};

export function useFrameCallback(
  callback: () => void,
  autostart = true
): FrameCallback {
  const ref = useRef<FrameCallback>({
    start: () => {
      NativeReanimated.manageStateFrameCallback(ref.current.callbackId, true);
      ref.current.state = true;
    },
    stop: () => {
      NativeReanimated.manageStateFrameCallback(ref.current.callbackId, false);
      ref.current.state = false;
    },
    state: false,
    callbackId: -1,
  });

  if (ref.current.callbackId === -1) {
    ref.current.callbackId = NativeReanimated.registerFrameCallback(callback);

    if (autostart) {
      ref.current.start();
    }
  }

  useEffect(() => {
    if (ref.current.callbackId === -1) {
      ref.current.callbackId = NativeReanimated.registerFrameCallback(callback);
    }

    return () => {
      NativeReanimated.unregisterFrameCallback(ref.current.callbackId);
      ref.current.state = false;
      ref.current.callbackId = -1;
    };
  });

  return ref.current;
}
