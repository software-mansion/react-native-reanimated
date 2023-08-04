import type { NativeScrollEvent } from 'react-native';
import type {} from '../commonTypes';
import type { DependencyList } from './commonTypes';
import { useEvent, useHandler } from './Hooks';
import { NativeSyntheticEvent } from 'react-native';

export interface ScrollEvent extends NativeScrollEvent {
  eventName: string;
}

type ScrollHandlerArguments<Context extends Record<string, unknown>> = [
  event: ScrollEvent,
  context: Context
];

export type ScrollHandler<Context extends Record<string, unknown>> = (
  ...args: ScrollHandlerArguments<Context>
) => void;
export interface ScrollHandlers<Context extends Record<string, unknown>> {
  onScroll?: ScrollHandler<Context>;
  onBeginDrag?: ScrollHandler<Context>;
  onEndDrag?: ScrollHandler<Context>;
  onMomentumBegin?: ScrollHandler<Context>;
  onMomentumEnd?: ScrollHandler<Context>;
}

export function useAnimatedScrollHandler<
  Context extends Record<string, unknown>
>(
  handlers: ScrollHandlers<Context> | ScrollHandler<Context>,
  dependencies?: DependencyList
) {
  // case when handlers is a function
  const scrollHandlers: ScrollHandlers<Context> =
    typeof handlers === 'function' ? { onScroll: handlers } : handlers;
  const { context, doDependenciesDiffer } = useHandler<ScrollEvent, Context>(
    // This cast is only to signify the problem of [key: string] usage
    // and will be eliminated in the future when types of
    // `useHandler` will be corrected.
    scrollHandlers as typeof scrollHandlers &
      Record<string, ScrollHandler<Context>>,
    dependencies
  );

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

  return useEvent<ScrollEvent>(
    (event: ScrollEvent) => {
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
    // This casts stems from `react-native-reanimated` pretending that
    // our event hooks use `react-native` wrapper event objects
    // for easier assignment to `onScroll` prop in components.
    // This will be fixed in the future.
  ) as (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
}
