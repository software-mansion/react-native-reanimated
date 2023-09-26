'use strict';
import type {
  DependencyList,
  RNNativeScrollEvent,
  ReanimatedScrollEvent,
} from './commonTypes';
import { useHandler } from './useHandler';
import type { EventHandlerInternal, EventHandlerProcessed } from './useEvent';
import { useEvent } from './useEvent';

export type ScrollHandler<
  Context extends Record<string, unknown> = Record<string, unknown>
> = (event: ReanimatedScrollEvent, context: Context) => void;
export interface ScrollHandlers<Context extends Record<string, unknown>> {
  onScroll?: ScrollHandler<Context>;
  onBeginDrag?: ScrollHandler<Context>;
  onEndDrag?: ScrollHandler<Context>;
  onMomentumBegin?: ScrollHandler<Context>;
  onMomentumEnd?: ScrollHandler<Context>;
}

export type ScrollHandlerProcessed<
  Context extends Record<string, unknown> = Record<string, unknown>
> = EventHandlerProcessed<RNNativeScrollEvent, Context>;

export type ScrollHandlerInternal = EventHandlerInternal<RNNativeScrollEvent>;

// @ts-expect-error This overload is required by our API.
export function useAnimatedScrollHandler<
  Context extends Record<string, unknown>
>(
  handlers: ScrollHandler<Context> | ScrollHandlers<Context>,
  dependencies?: DependencyList
): ScrollHandlerProcessed<Context>;

export function useAnimatedScrollHandler<
  Context extends Record<string, unknown>
>(
  handlers: ScrollHandlers<Context> | ScrollHandler<Context>,
  dependencies?: DependencyList
) {
  // case when handlers is a function
  const scrollHandlers: ScrollHandlers<Context> =
    typeof handlers === 'function' ? { onScroll: handlers } : handlers;
  const { context, doDependenciesDiffer } = useHandler<
    RNNativeScrollEvent,
    Context
  >(scrollHandlers as Record<string, ScrollHandler<Context>>, dependencies);

  // build event subscription array
  const subscribeForEvents = ['onScroll'];
  if (scrollHandlers.onBeginDrag !== undefined) {
    subscribeForEvents.push('onScrollBeginDrag');
  }
  if (scrollHandlers.onEndDrag !== undefined) {
    subscribeForEvents.push('onScrollEndDrag');
  }
  if (scrollHandlers.onMomentumBegin !== undefined) {
    subscribeForEvents.push('onMomentumScrollBegin');
  }
  if (scrollHandlers.onMomentumEnd !== undefined) {
    subscribeForEvents.push('onMomentumScrollEnd');
  }

  return useEvent<RNNativeScrollEvent, Context>(
    (event: ReanimatedScrollEvent) => {
      'worklet';
      const {
        onScroll,
        onBeginDrag,
        onEndDrag,
        onMomentumBegin,
        onMomentumEnd,
      } = scrollHandlers;
      if (onScroll && event.eventName.endsWith('onScroll')) {
        onScroll(event, context);
      } else if (onBeginDrag && event.eventName.endsWith('onScrollBeginDrag')) {
        onBeginDrag(event, context);
      } else if (onEndDrag && event.eventName.endsWith('onScrollEndDrag')) {
        onEndDrag(event, context);
      } else if (
        onMomentumBegin &&
        event.eventName.endsWith('onMomentumScrollBegin')
      ) {
        onMomentumBegin(event, context);
      } else if (
        onMomentumEnd &&
        event.eventName.endsWith('onMomentumScrollEnd')
      ) {
        onMomentumEnd(event, context);
      }
    },
    subscribeForEvents,
    doDependenciesDiffer
    // Read https://github.com/software-mansion/react-native-reanimated/pull/5056
    // for more information about this cast.
  ) as unknown as ScrollHandlerInternal;
}
