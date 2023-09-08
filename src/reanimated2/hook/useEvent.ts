import { useRef } from 'react';
import WorkletEventHandler from '../WorkletEventHandler';
import type { NativeEvent } from './commonTypes';

// TODO TYPESCRIPT
// @ts-expect-error This overload seems to be necessary at the moment.
export function useEvent<Payload extends object>(
  handler: (event: NativeEvent<Payload>) => void,
  eventNames: string[],
  rebuild?: boolean
): (event: NativeEvent<Payload>) => void;

export function useEvent<Payload extends object>(
  handler: (event: NativeEvent<Payload>) => void,
  eventNames: string[] = [],
  rebuild = false
) {
  const initRef = useRef<WorkletEventHandler<Payload> | null>(null);
  if (initRef.current === null) {
    initRef.current = new WorkletEventHandler(handler, eventNames);
  } else if (rebuild) {
    initRef.current.updateWorklet(handler);
  }

  return initRef;
}
