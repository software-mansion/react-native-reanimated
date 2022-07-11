import { useEffect, useRef } from 'react';
import NativeReanimated from '../NativeReanimated';

export type FrameCallback = {
  start: () => void,
  stop: () => void,
  state: boolean,
  callbackId: number,
}

export function useFrameCallback(callback: () => void): FrameCallback {
  const ref = useRef<FrameCallback>({
    start: () => {},
    stop: () => {},
    state: false,
    callbackId: -1,
  });

  if (ref.current.callbackId = -1) {
    
  }

  useEffect(() => {
    // todo
    ref.current.callbackId = NativeReanimated.registerFrameCallback(callback);

    return () => {
      NativeReanimated.unregisterFrameCallback(ref.current.callbackId);
    }
  });

  return ref.current;
}
