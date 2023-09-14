'use strict';
import type { MutableRefObject } from 'react';
import { useRef } from 'react';
import type { NativeEvent } from '../commonTypes';
import WorkletEventHandler from '../WorkletEventHandler';
import type { NativeSyntheticEvent } from 'react-native';

// TODO TYPESCRIPT This is a temporary type to get rid of .d.ts file.
type useEventType = <T extends object>(
  handler: (e: T) => void,
  eventNames?: string[],
  rebuild?: boolean
) => (e: NativeSyntheticEvent<T>) => void;

export const useEvent = function <T extends NativeEvent<T>>(
  handler: (event: T) => void,
  eventNames: string[] = [],
  rebuild = false
): MutableRefObject<WorkletEventHandler<T> | null> {
  const initRef = useRef<WorkletEventHandler<T> | null>(null);
  if (initRef.current === null) {
    initRef.current = new WorkletEventHandler(handler, eventNames);
  } else if (rebuild) {
    initRef.current.updateWorklet(handler);
  }

  return initRef;
  // TODO TYPESCRIPT This cast is to get rid of .d.ts file.
} as unknown as useEventType;
