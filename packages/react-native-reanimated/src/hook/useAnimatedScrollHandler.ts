'use strict';
import type {
  DependencyList,
  ReanimatedScrollEvent,
  RNNativeScrollEvent,
} from './commonTypes';
import type { EventHandlerInternal, EventHandlerProcessed } from './useEvent';
import { useEvent } from './useEvent';
import { useHandler } from './useHandler';

export type ScrollHandler<
  Context extends Record<string, unknown> = Record<string, unknown>,
> = (event: ReanimatedScrollEvent, context: Context) => void;
export interface ScrollHandlers<Context extends Record<string, unknown>> {
  onScroll?: ScrollHandler<Context>;
  onBeginDrag?: ScrollHandler<Context>;
  onEndDrag?: ScrollHandler<Context>;
  onMomentumBegin?: ScrollHandler<Context>;
  onMomentumEnd?: ScrollHandler<Context>;
}

export type ScrollHandlerProcessed<
  Context extends Record<string, unknown> = Record<string, unknown>,
> = EventHandlerProcessed<RNNativeScrollEvent, Context>;

type ScrollHandlerInternal = EventHandlerInternal<RNNativeScrollEvent>;

/**
 * Lets you run callbacks on ScrollView events. Supports `onScroll`,
 * `onBeginDrag`, `onEndDrag`, `onMomentumBegin`, and `onMomentumEnd` events.
 *
 * These callbacks are automatically workletized and ran on the UI thread.
 *
 * @param handlers - An object containing event handlers.
 * @param dependencies - An optional array of dependencies. Only relevant when
 *   using Reanimated without the Babel plugin on the Web.
 * @returns An object you need to pass to `onScroll` prop on the
 *   `Animated.ScrollView` component.
 * @see https://docs.swmansion.com/react-native-reanimated/docs/scroll/useAnimatedScrollHandler
 */
// @ts-expect-error This overload is required by our API.
export function useAnimatedScrollHandler<
  Context extends Record<string, unknown>,
>(
  handlers: ScrollHandler<Context> | ScrollHandlers<Context>,
  dependencies?: DependencyList
): ScrollHandlerProcessed<Context>;

export function useAnimatedScrollHandler<
  Context extends Record<string, unknown>,
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
