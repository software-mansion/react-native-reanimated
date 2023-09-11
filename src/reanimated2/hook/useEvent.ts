import type { MutableRefObject } from 'react';
import { useRef } from 'react';
import WorkletEventHandler from '../WorkletEventHandler';
import type {
  RNEvent,
  ReanimatedEvent,
  ReanimatedPayload,
} from './commonTypes';

export type EventHandler<
  Payload extends object,
  Context extends Record<string, unknown>
> = (
  event: ReanimatedEvent<ReanimatedPayload<Payload>>,
  context?: Context
) => void;

export type EventHandlerProcessed<
  Payload extends object,
  Context extends Record<string, unknown>
> = (event: RNEvent<Payload>, context?: Context) => void;

export type EventHandlerInternal<Payload extends object> = MutableRefObject<
  WorkletEventHandler<Payload>
>;

// @ts-expect-error This is fine.
// This cast is necessary if we want to keep our API simple.
// We don't know which properites of a component that is made into
// an AnimatedComponent are handlers and we don't want to force the user to define it.
// Therefore we disguise `useEvent` return type as a simple function and we handle
// it being a React Ref in `createAnimatedComponent`.
export function useEvent<
  Payload extends object,
  Context extends Record<string, unknown> = never
>(
  handler: EventHandler<Payload, Context>,
  eventNames?: string[],
  rebuild?: boolean
): EventHandlerProcessed<Payload, Context>;

export function useEvent<Payload extends object, Context = never>(
  handler: (event: ReanimatedEvent<Payload>, context?: Context) => void,
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
