'use strict';
import { useEvent } from './useEvent';
import { useHandler } from './useHandler';
import { WorkletEventHandler } from '../WorkletEventHandler';
import type {
  JSEvent,
  JSHandler,
  ReanimatedEvent,
  UseEventInternal,
} from './commonTypes';
import type { WorkletFunction } from '../commonTypes';
import type { EventHandlerProcessed, EventHandlerInternal } from './useEvent';

/**
 * Lets you compose multiple event handlers based on [useEvent](https://docs.swmansion.com/react-native-reanimated/docs/advanced/useEvent) hook.
 *
 * @param handlers - An array of event handlers created using [useEvent](https://docs.swmansion.com/react-native-reanimated/docs/advanced/useEvent) hook.
 * @param JSHandlers - An array of JS event handlers, similar to [useAnimatedScrollHandler argument](https://docs.swmansion.com/react-native-reanimated/docs/scroll/useAnimatedScrollHandler#scrollhandlerorhandlersobject-object-with-worklets)
 * @returns An object you need to pass to a coresponding "onEvent" prop on an `Animated` component (for example handlers responsible for `onScroll` event go to `onScroll` prop).
 * @see https://docs.swmansion.com/react-native-reanimated/docs/advanced/useComposedEventHandler
 */
// @ts-expect-error This overload is required by our API.
export function useComposedEventHandler<
  Event extends object,
  Context extends Record<string, unknown>
>(
  handlers?: (EventHandlerProcessed<Event, Context> | null)[],
  JSHandlers?: JSHandlersObject<Event>[]
): ComposedHandlerProcessed<Event, Context>;

export function useComposedEventHandler<
  Event extends object,
  Context extends Record<string, unknown>
>(
  handlers?: (EventHandlerProcessed<Event, Context> | null)[],
  JSHandlers?: JSHandlersObject<Event>[]
) {
  // Record of handlers' worklets to calculate deps diffs. We use the record type to match the useHandler API requirements
  const workletsRecord: Record<string, WorkletFunction> = {};
  // Summed event names for registration
  const composedEventNames = new Set<string>();
  // Map that holds worklets for specific handled events
  const workletsMap: {
    [key: string]: ((event: ReanimatedEvent<Event>) => void)[];
  } = {};
  // Record of provided JS handlers, used for passing it further down to WorkletEventHandler
  const JSHandlersRecord: Partial<
    Record<JSScrollEventsOutput, JSHandler<Event>>
  > = {};
  // Helper map used for merging same-event JS handlers into JSHandlersRecord object
  const JSHandlersMap: Partial<
    Record<JSScrollEventsInput, JSHandler<Event>[]>
  > = {};

  // Setup the JSHandlersRecord object
  if (JSHandlers) {
    // Store callbacks for each JS event in a record
    JSHandlers.forEach((handler) => {
      if (handler.onScroll) {
        if (JSHandlersMap.onScroll) {
          JSHandlersMap.onScroll.push(handler.onScroll);
        } else {
          JSHandlersMap.onScroll = [handler.onScroll];
        }
      }
      if (handler.onBeginDrag) {
        if (JSHandlersMap.onBeginDrag) {
          JSHandlersMap.onBeginDrag.push(handler.onBeginDrag);
        } else {
          JSHandlersMap.onBeginDrag = [handler.onBeginDrag];
        }
      }
      if (handler.onEndDrag) {
        if (JSHandlersMap.onEndDrag) {
          JSHandlersMap.onEndDrag.push(handler.onEndDrag);
        } else {
          JSHandlersMap.onEndDrag = [handler.onEndDrag];
        }
      }
      if (handler.onMomentumBegin) {
        if (JSHandlersMap.onMomentumBegin) {
          JSHandlersMap.onMomentumBegin.push(handler.onMomentumBegin);
        } else {
          JSHandlersMap.onMomentumBegin = [handler.onMomentumBegin];
        }
      }
      if (handler.onMomentumEnd) {
        if (JSHandlersMap.onMomentumEnd) {
          JSHandlersMap.onMomentumEnd.push(handler.onMomentumEnd);
        } else {
          JSHandlersMap.onMomentumEnd = [handler.onMomentumEnd];
        }
      }
    });

    // Merge callbacks for given event and put them in the record object
    Object.keys(JSHandlersMap).forEach((eventInput) => {
      const eventOutput =
        JSScrollEventsPropMap[eventInput as unknown as JSScrollEventsInput];
      const callbacks =
        JSHandlersMap[eventInput as unknown as JSScrollEventsInput];

      JSHandlersRecord[eventOutput] = (event: JSEvent<Event>) => {
        callbacks?.forEach((callback) => {
          callback(event);
        });
      };
    });
  }

  if (handlers) {
    handlers
      .filter((h) => h !== null)
      .forEach((handler) => {
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
  }

  const { doDependenciesDiffer } = useHandler(workletsRecord);
  // TODO: ADD DEPS BASED ON JS HANDLERS

  // @ts-expect-error We need the internal type
  return (useEvent as UseEventInternal<Event, Context>)(
    (event: ReanimatedEvent<Event>) => {
      'worklet';
      if (workletsMap[event.eventName]) {
        workletsMap[event.eventName].forEach((worklet) => worklet(event));
      }
    },
    Array.from(composedEventNames),
    doDependenciesDiffer,
    JSHandlersRecord
  ) as unknown as ComposedHandlerInternal<Event>;
}

type ComposedHandlerProcessed<
  Event extends object,
  Context extends Record<string, unknown> = Record<string, unknown>
> = EventHandlerProcessed<Event, Context>;

type ComposedHandlerInternal<Event extends object> =
  EventHandlerInternal<Event>;

type JSScrollEventsInput =
  | 'onScroll'
  | 'onBeginDrag'
  | 'onEndDrag'
  | 'onMomentumBegin'
  | 'onMomentumEnd';

type JSScrollEventsOutput =
  | 'onScroll'
  | 'onScrollBeginDrag'
  | 'onScrollEndDrag'
  | 'onMomentumScrollBegin'
  | 'onMomentumScrollEnd';

const JSScrollEventsPropMap: Record<JSScrollEventsInput, JSScrollEventsOutput> =
  {
    onScroll: 'onScroll',
    onBeginDrag: 'onScrollBeginDrag',
    onEndDrag: 'onScrollEndDrag',
    onMomentumBegin: 'onMomentumScrollBegin',
    onMomentumEnd: 'onMomentumScrollEnd',
  };

type JSHandlersObject<Event extends object> = Partial<
  Record<JSScrollEventsInput, JSHandler<Event>>
>;
