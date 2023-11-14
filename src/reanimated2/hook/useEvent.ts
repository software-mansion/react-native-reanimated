'use strict';
import type { MutableRefObject } from 'react';
import { useRef } from 'react';
import WorkletEventHandler from '../WorkletEventHandler';
import type { ReanimatedEvent } from './commonTypes';

/**
 * Worklet to provide as an argument to `useEvent` hook.
 */
export type EventHandler<
  Event extends object,
  Context extends Record<string, unknown> = never
> = (event: ReanimatedEvent<Event>, context?: Context) => void;

/**
 * Return type of `useEvent` hook.
 */
export type EventHandlerProcessed<
  Event extends object,
  Context extends Record<string, unknown> = never
> = (event: Event, context?: Context) => void;

/**
 * Real return type of `useEvent` hook - only meant to be used internally.
 */
export type EventHandlerInternal<Event extends object> = MutableRefObject<
  WorkletEventHandler<Event>
>;

// @ts-expect-error This overload is required by our API.
// We don't know which properites of a component that is made into
// an AnimatedComponent are event handlers and we don't want to force the user to define it.
// Therefore we disguise `useEvent` return type as a simple function and we handle
// it being a React Ref in `createAnimatedComponent`.
export function useEvent<
  Event extends object,
  Context extends Record<string, unknown> = never
>(
  handler: EventHandler<Event, Context>,
  eventNames?: string[],
  rebuild?: boolean
): EventHandlerProcessed<Event, Context>;

export function useEvent<Event extends object, Context = never>(
  handler: (event: ReanimatedEvent<Event>, context?: Context) => void,
  eventNames: string[] = [],
  rebuild = false
): EventHandlerInternal<Event> {
  const initRef = useRef<WorkletEventHandler<Event> | null>(null);
  if (initRef.current === null) {
    initRef.current = new WorkletEventHandler<Event>(handler, eventNames);
  } else if (rebuild) {
    initRef.current.updateWorklet(handler);
  }

  // We cast it since we don't want to expose initial null value outside.
  return initRef as EventHandlerInternal<Event>;
}
