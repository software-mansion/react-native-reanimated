'use strict';
import { useEvent } from './useEvent';
import { useHandler } from './useHandler';
import { WorkletEventHandler } from '../WorkletEventHandler';
import type {
  JSEvent,
  ReactEventHandler,
  ReanimatedEvent,
  UseEventInternal,
} from './commonTypes';
import type { WorkletFunction } from '../commonTypes';
import type { EventHandlerProcessed, EventHandlerInternal } from './useEvent';
import { has } from '../createAnimatedComponent/utils';
import { useRef } from 'react';
import { isWorkletEventHandler } from './commonTypes';

/**
 * Lets you compose multiple event handlers.
 *
 * @param handlers - An array of either event handlers created using [useEvent hook](https://docs.swmansion.com/react-native-reanimated/docs/advanced/useEvent) or JS event handlers, similar to [useAnimatedScrollHandler argument](https://docs.swmansion.com/react-native-reanimated/docs/scroll/useAnimatedScrollHandler#scrollhandlerorhandlersobject-object-with-worklets).
 * @returns An object you need to pass to a coresponding "onEvent" prop on an `Animated` component (for example handlers responsible for `onScroll` event go to `onScroll` prop).
 * @see https://docs.swmansion.com/react-native-reanimated/docs/advanced/useComposedEventHandler
 */
// @ts-expect-error This overload is required by our API.
export function useComposedEventHandler<
  Event extends object,
  Context extends Record<string, unknown>
>(
  handlers: (
    | EventHandlerProcessed<Event, Context>
    | ReactHandlersObject<Event>
    | null
  )[]
): ComposedHandlerProcessed<Event, Context>;

export function useComposedEventHandler<
  Event extends object,
  Context extends Record<string, unknown>
>(
  handlers: (
    | EventHandlerProcessed<Event, Context>
    | ReactHandlersObject<Event>
    | null
  )[]
) {
  // Summed event names for worklet handlers registration
  const composedEventNames = new Set<string>();
  // Map that holds worklets for specific handled events
  const workletsMap: {
    [key: string]: ((event: ReanimatedEvent<Event>) => void)[];
  } = {};
  // Record of handlers' worklets to calculate deps diffs
  const workletsRecord: Record<string, WorkletFunction> = {};

  const workletHandlers = handlers
    .filter((handler) => handler !== null)
    .filter((handler) => isWorkletEventHandler(handler));

  workletHandlers.forEach((handler) => {
    // EventHandlerProcessed is the return type of useEvent and has to be force casted to EventHandlerInternal, because we need WorkletEventHandler object
    const { workletEventHandler } =
      handler as unknown as EventHandlerInternal<Context>;
    if (workletEventHandler instanceof WorkletEventHandler) {
      workletEventHandler.eventNames.forEach((eventName) => {
        composedEventNames.add(eventName);

        if (workletsMap[eventName]) {
          workletsMap[eventName].push(workletEventHandler.worklet);
        } else {
          workletsMap[eventName] = [workletEventHandler.worklet];
        }

        const handlerName = eventName + `${workletsMap[eventName].length}`;
        workletsRecord[handlerName] =
          workletEventHandler.worklet as WorkletFunction;
      });
    }
  });

  const { doDependenciesDiffer } = useHandler(workletsRecord);

  // Record of provided JS handlers, used for passing it further down to WorkletEventHandler
  const ReactHandlersRecord: Partial<
    Record<ReactScrollEventsOutput, ReactEventHandler<Event>>
  > = {};
  // Helper map used for merging same-event JS handlers into JSHandlersRecord object
  const ReactHandlersMap: Partial<
    Record<ReactScrollEventsInput, ReactEventHandler<Event>[]>
  > = {};
  // Ref to compare changes in JSHandlers
  const ReactHandlersRef = useRef<ReactHandlersObject<Event>[] | null>(null);
  // Flag that lets JS handlers get rebuilt too
  let JSHandlersNeedRebuild = false;

  const ReactHandlers: ReactHandlersObject<Event>[] = handlers
    .filter((handler) => handler !== null)
    .filter((handler) =>
      isReactHandler(handler)
    ) as ReactHandlersObject<Event>[];

  // Update/initialize the ref and determine whether JS handlers need rebuild or not
  if (ReactHandlersRef.current === null) {
    ReactHandlersRef.current = ReactHandlers;
  } else {
    JSHandlersNeedRebuild = !areReactHandlersEqual(
      ReactHandlersRef.current,
      ReactHandlers
    );
    ReactHandlersRef.current = ReactHandlers;
  }

  // Setup the JSHandlersRecord object
  if (ReactHandlers.length > 0) {
    // Store callbacks for each JS event in a record
    ReactHandlers.forEach((handler) => {
      if (handler.onScroll) {
        if (ReactHandlersMap.onScroll) {
          ReactHandlersMap.onScroll.push(handler.onScroll);
        } else {
          ReactHandlersMap.onScroll = [handler.onScroll];
        }
      }
      if (handler.onBeginDrag) {
        if (ReactHandlersMap.onBeginDrag) {
          ReactHandlersMap.onBeginDrag.push(handler.onBeginDrag);
        } else {
          ReactHandlersMap.onBeginDrag = [handler.onBeginDrag];
        }
      }
      if (handler.onEndDrag) {
        if (ReactHandlersMap.onEndDrag) {
          ReactHandlersMap.onEndDrag.push(handler.onEndDrag);
        } else {
          ReactHandlersMap.onEndDrag = [handler.onEndDrag];
        }
      }
      if (handler.onMomentumBegin) {
        if (ReactHandlersMap.onMomentumBegin) {
          ReactHandlersMap.onMomentumBegin.push(handler.onMomentumBegin);
        } else {
          ReactHandlersMap.onMomentumBegin = [handler.onMomentumBegin];
        }
      }
      if (handler.onMomentumEnd) {
        if (ReactHandlersMap.onMomentumEnd) {
          ReactHandlersMap.onMomentumEnd.push(handler.onMomentumEnd);
        } else {
          ReactHandlersMap.onMomentumEnd = [handler.onMomentumEnd];
        }
      }
    });

    // Merge callbacks for given event and put them in the record object
    Object.keys(ReactHandlersMap).forEach((eventInput) => {
      const eventOutput =
        ReactScrollEventsPropMap[
          eventInput as unknown as ReactScrollEventsInput
        ];
      const callbacks =
        ReactHandlersMap[eventInput as unknown as ReactScrollEventsInput];

      ReactHandlersRecord[eventOutput] = (event: JSEvent<Event>) => {
        callbacks?.forEach((callback) => {
          callback(event);
        });
      };
    });
  }

  // @ts-expect-error We need the internal type
  return (useEvent as UseEventInternal<Event, Context>)(
    (event: ReanimatedEvent<Event>) => {
      'worklet';
      if (workletsMap[event.eventName]) {
        workletsMap[event.eventName].forEach((worklet) => worklet(event));
      }
    },
    Array.from(composedEventNames),
    doDependenciesDiffer || JSHandlersNeedRebuild,
    ReactHandlersRecord
  ) as unknown as ComposedHandlerInternal<Event>;
}

type ComposedHandlerProcessed<
  Event extends object,
  Context extends Record<string, unknown> = Record<string, unknown>
> = EventHandlerProcessed<Event, Context>;

type ComposedHandlerInternal<Event extends object> =
  EventHandlerInternal<Event>;

type ReactScrollEventsInput =
  | 'onScroll'
  | 'onBeginDrag'
  | 'onEndDrag'
  | 'onMomentumBegin'
  | 'onMomentumEnd';

type ReactScrollEventsOutput =
  | 'onScroll'
  | 'onScrollBeginDrag'
  | 'onScrollEndDrag'
  | 'onMomentumScrollBegin'
  | 'onMomentumScrollEnd';

const ReactScrollEventsPropMap: Record<
  ReactScrollEventsInput,
  ReactScrollEventsOutput
> = {
  onScroll: 'onScroll',
  onBeginDrag: 'onScrollBeginDrag',
  onEndDrag: 'onScrollEndDrag',
  onMomentumBegin: 'onMomentumScrollBegin',
  onMomentumEnd: 'onMomentumScrollEnd',
};

type ReactHandlersObject<Event extends object> = Partial<
  Record<ReactScrollEventsInput, ReactEventHandler<Event>>
>;

function isReactHandler(
  handler: unknown
): handler is ReactHandlersObject<Event> {
  return Object.keys(ReactScrollEventsPropMap).reduce((acc, val) => {
    return acc || has(val, handler);
  }, false);
}

function areReactHandlersEqual<Event extends object>(
  oldHandlers: ReactHandlersObject<Event>[],
  newHandlers: ReactHandlersObject<Event>[]
) {
  if (oldHandlers.length !== newHandlers.length) {
    return false;
  }
  let handlersEqual = true;
  for (let i = 0; i < oldHandlers.length; i++) {
    const oldHandler = oldHandlers[i];
    const newHandler = newHandlers[i];

    const oldKeys = Object.keys(oldHandler).sort();
    const newKeys = Object.keys(newHandler).sort();

    if (oldKeys.toString() !== newKeys.toString()) {
      handlersEqual = false;
      break;
    }

    for (const key of oldKeys) {
      const castedKey = key as unknown as ReactScrollEventsInput;
      if (oldHandlers[i][castedKey] !== newHandlers[i][castedKey]) {
        handlersEqual = false;
        break;
      }
    }

    if (!handlersEqual) {
      break;
    }
  }

  return handlersEqual;
}
