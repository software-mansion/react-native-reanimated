import type { RefObject } from 'react';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import type { __Context, NativeEvent, __WorkletFunction } from '../commonTypes';
import type WorkletEventHandler from '../WorkletEventHandler';
import type { DependencyList } from './commonTypes';
import { useEvent, useHandler } from './Hooks';

export interface ScrollHandler<TContext extends __Context>
  extends __WorkletFunction {
  (event: NativeScrollEvent, context?: TContext): void;
}

export interface ScrollEvent
  extends NativeScrollEvent,
    NativeEvent<ScrollEvent> {
  eventName: string;
}
export interface ScrollHandlers<TContext extends __Context> {
  [key: string]: ScrollHandler<TContext> | undefined;
  onScroll?: ScrollHandler<TContext>;
  onBeginDrag?: ScrollHandler<TContext>;
  onEndDrag?: ScrollHandler<TContext>;
  onMomentumBegin?: ScrollHandler<TContext>;
  onMomentumEnd?: ScrollHandler<TContext>;
}

// TODO TYPESCRIPT This is a temporary type to get rid of .d.ts file.
type OnScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => void;

// TODO TYPESCRIPT This is a temporary type to get rid of .d.ts file.
type useAnimatedScrollHandlerType = <
  TContext extends __Context = Record<string, never>
>(
  handlers: ScrollHandlers<TContext> | ScrollHandler<TContext>,
  deps?: DependencyList
) => OnScroll;

export const useAnimatedScrollHandler = function <TContext extends __Context>(
  handlers: ScrollHandlers<TContext> | ScrollHandler<TContext>,
  dependencies?: DependencyList
): RefObject<WorkletEventHandler<ScrollEvent>> {
  // case when handlers is a function
  const scrollHandlers: ScrollHandlers<TContext> =
    typeof handlers === 'function' ? { onScroll: handlers } : handlers;
  const { context, doDependenciesDiffer } = useHandler<ScrollEvent, TContext>(
    scrollHandlers,
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
    // TODO TYPESCRIPT This temporary cast is to get rid of .d.ts file.
  ) as any;
  // TODO TYPESCRIPT This temporary cast is to get rid of .d.ts file.
} as unknown as useAnimatedScrollHandlerType;
