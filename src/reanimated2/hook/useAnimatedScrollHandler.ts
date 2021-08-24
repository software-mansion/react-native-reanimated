import { RefObject, useEffect, useRef } from 'react';
import { NativeScrollEvent } from 'react-native';
import { WorkletFunction } from '../commonTypes';
import { makeRemote } from '../core';
import WorkletEventHandler from '../WorkletEventHandler';
import {
  Context,
  ContextWithDependencies,
  DependencyList,
} from './commonTypes';
import { areDependenciesEqual, buildDependencies, useEvent } from './utils';

export interface ScrollHandler<TContext extends Context>
  extends WorkletFunction {
  (event: NativeScrollEvent, context?: TContext): void;
}

interface ScrollEvent extends NativeScrollEvent {
  eventName: string;
}
export interface ScrollHandlers<TContext extends Context> {
  [key: string]: ScrollHandler<TContext> | undefined;
  onScroll?: ScrollHandler<TContext>;
  onBeginDrag?: ScrollHandler<TContext>;
  onEndDrag?: ScrollHandler<TContext>;
  onMomentumBegin?: ScrollHandler<TContext>;
  onMomentumEnd?: ScrollHandler<TContext>;
}

export function useAnimatedScrollHandler<TContext extends Context>(
  handlers: ScrollHandlers<TContext> | ScrollHandler<TContext>,
  dependencies?: DependencyList
): RefObject<WorkletEventHandler> {
  // case when handlers is a function
  const scrollHandlers: ScrollHandlers<TContext> =
    typeof handlers === 'function' ? { onScroll: handlers } : handlers;
  const initRef = useRef<ContextWithDependencies<TContext> | null>(null);
  if (initRef.current === null) {
    initRef.current = {
      context: makeRemote({}),
      savedDependencies: [],
    };
  }

  useEffect(() => {
    return () => {
      initRef.current = null;
    };
  }, []);

  const { context, savedDependencies } = initRef.current;

  dependencies = buildDependencies(dependencies, scrollHandlers);

  const dependenciesDiffer = !areDependenciesEqual(
    dependencies,
    savedDependencies
  );
  initRef.current.savedDependencies = dependencies;

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
    dependenciesDiffer
  );
}
