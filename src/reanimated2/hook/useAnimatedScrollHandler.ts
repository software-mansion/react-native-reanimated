import { RefObject } from 'react';
import { NativeScrollEvent } from 'react-native';
import { WorkletClosure, NativeEvent, WorkletFunction } from '../commonTypes';
import WorkletEventHandler from '../WorkletEventHandler';
import { DependencyList } from './commonTypes';
import { useEvent, useHandler } from './Hooks';

export interface ScrollHandler<Context extends WorkletClosure>
  extends WorkletFunction {
  (event: NativeScrollEvent, context?: Context): void;
}

export interface ScrollEvent
  extends NativeScrollEvent,
    NativeEvent<ScrollEvent> {
  eventName: string;
}
export interface ScrollHandlers<Context extends WorkletClosure> {
  [key: string]: ScrollHandler<Context> | undefined;
  onScroll?: ScrollHandler<Context>;
  onBeginDrag?: ScrollHandler<Context>;
  onEndDrag?: ScrollHandler<Context>;
  onMomentumBegin?: ScrollHandler<Context>;
  onMomentumEnd?: ScrollHandler<Context>;
}

export function useAnimatedScrollHandler<Context extends WorkletClosure>(
  handlers: ScrollHandlers<Context> | ScrollHandler<Context>,
  dependencies?: DependencyList
): RefObject<WorkletEventHandler<ScrollEvent>> {
  // case when handlers is a function
  const scrollHandlers: ScrollHandlers<Context> =
    typeof handlers === 'function' ? { onScroll: handlers } : handlers;
  const { context, doDependenciesDiffer } = useHandler<ScrollEvent, Context>(
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
  );
}
