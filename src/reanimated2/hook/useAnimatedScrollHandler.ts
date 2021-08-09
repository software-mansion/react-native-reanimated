import { MutableRefObject, useEffect, useRef } from 'react';
import { NativeScrollEvent } from 'react-native';
import { makeRemote } from '../core';
import WorkletEventHandler from '../WorkletEventHandler';
import {
  Context,
  ContextWithDependencies,
  DependencyList,
  WorkletFunction,
} from './commonTypes';
import { areDependenciesEqual, buildDependencies, useEvent } from './utils';

interface ScrollHandler<TContext extends Context> extends WorkletFunction {
  (event: NativeScrollEvent, context?: TContext): void;
}

interface ScrollEvent extends NativeScrollEvent {
  eventName: string;
}
interface ScrollHandlers<TContext extends Context> {
  onScroll?: ScrollHandler<TContext>;
  onBeginDrag?: ScrollHandler<TContext>;
  onEndDrag?: ScrollHandler<TContext>;
  onMomentumBegin?: ScrollHandler<TContext>;
  onMomentumEnd?: ScrollHandler<TContext>;
}

interface SingleScrollHandler<TContext extends Context>
  extends ScrollHandlers<TContext> {
  (event: NativeScrollEvent, context?: TContext): void;
}

export function useAnimatedScrollHandler<TContext extends Context>(
  handlers: ScrollHandlers<TContext> | SingleScrollHandler<TContext>,
  dependencies?: DependencyList
): MutableRefObject<WorkletEventHandler> {
  const initRef = useRef<ContextWithDependencies<TContext>>(null);
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

  dependencies = buildDependencies(
    dependencies,
    <Record<string, WorkletFunction>>handlers
  );

  const dependenciesDiffer = !areDependenciesEqual(
    dependencies,
    savedDependencies
  );
  initRef.current.savedDependencies = dependencies;

  // build event subscription array
  const subscribeForEvents = ['onScroll'];
  if (handlers.onBeginDrag !== undefined) {
    subscribeForEvents.push('onScrollBeginDrag');
  }
  if (handlers.onEndDrag !== undefined) {
    subscribeForEvents.push('onScrollEndDrag');
  }
  if (handlers.onMomentumBegin !== undefined) {
    subscribeForEvents.push('onMomentumScrollBegin');
  }
  if (handlers.onMomentumEnd !== undefined) {
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
      } = handlers;
      if (event.eventName.endsWith('onScroll')) {
        if (onScroll) {
          onScroll(event, context);
        } else if (typeof handlers === 'function') {
          handlers(event, context);
        }
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
