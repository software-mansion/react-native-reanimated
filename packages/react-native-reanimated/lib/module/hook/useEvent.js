'use strict';

import { useRef } from 'react';
import { WorkletEventHandler } from '../WorkletEventHandler';

/** Worklet to provide as an argument to `useEvent` hook. */

/**
 * Lets you run a function whenever a specified native event occurs.
 *
 * @param handler - A function that receives an event object with event data -
 *   {@link EventHandler}.
 * @param eventNames - An array of event names the `handler` callback will react
 *   to.
 * @param rebuild - Whether the event handler should be rebuilt. Defaults to
 *   `false`.
 * @returns A function that will be called when the event occurs -
 *   {@link EventHandlerProcessed}.
 * @see https://docs.swmansion.com/react-native-reanimated/docs/advanced/useEvent
 */
// @ts-expect-error This overload is required by our API.
// We don't know which properites of a component that is made into
// an AnimatedComponent are event handlers and we don't want to force the user to define it.
// Therefore we disguise `useEvent` return type as a simple function and we handle
// it being a React Ref in `createAnimatedComponent`.

export function useEvent(handler, eventNames = [], rebuild = false) {
  const initRef = useRef(null);
  if (initRef.current === null) {
    const workletEventHandler = new WorkletEventHandler(handler, eventNames);
    initRef.current = {
      workletEventHandler
    };
  } else if (rebuild) {
    const workletEventHandler = initRef.current.workletEventHandler;
    workletEventHandler.updateEventHandler(handler, eventNames);
    initRef.current = {
      workletEventHandler
    };
  }
  return initRef.current;
}
//# sourceMappingURL=useEvent.js.map