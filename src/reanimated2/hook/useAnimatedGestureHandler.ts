import { MutableRefObject, useEffect, useRef } from 'react';
import { GestureHandlerStateChangeNativeEvent } from 'react-native-gesture-handler';
import { WorkletFunction } from '../commonTypes';
import { makeRemote } from '../core';
import { isWeb } from '../PlatformChecker';
import WorkletEventHandler from '../WorkletEventHandler';
import {
  Context,
  ContextWithDependencies,
  DependencyList,
} from './commonTypes';
import { areDependenciesEqual, buildDependencies, useEvent } from './utils';

interface Handler<T, TContext extends Context> extends WorkletFunction {
  (event: T, context: TContext, isCanceledOrFailed?: boolean): void;
}

enum EventState {
  FAILED = 1,
  BEGAN,
  CANCELLED,
  ACTIVE,
  END,
}

export interface GestureHandlers<T, TContext extends Context> {
  [key: string]: Handler<T, TContext> | undefined;
  onStart?: Handler<T, TContext>;
  onActive?: Handler<T, TContext>;
  onEnd?: Handler<T, TContext>;
  onFail?: Handler<T, TContext>;
  onCancel?: Handler<T, TContext>;
  onFinish?: Handler<T, TContext>;
}

export interface GestureHandlerEvent<T>
  extends GestureHandlerStateChangeNativeEvent {
  nativeEvent: T;
}

export function useAnimatedGestureHandler<
  T extends GestureHandlerEvent<T>,
  TContext extends Context
>(
  handlers: GestureHandlers<T, TContext>,
  dependencies?: DependencyList
): MutableRefObject<WorkletEventHandler | null> | ((e: T) => void) {
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

  dependencies = buildDependencies(dependencies, handlers);

  const dependenciesDiffer = !areDependenciesEqual(
    dependencies,
    savedDependencies
  );
  initRef.current.savedDependencies = dependencies;
  const useWeb = isWeb();

  const handler = (e: T) => {
    'worklet';
    const event = useWeb ? e.nativeEvent : e;

    if (event.state === EventState.BEGAN && handlers.onStart) {
      handlers.onStart(event, context);
    }
    if (event.state === EventState.ACTIVE && handlers.onActive) {
      handlers.onActive(event, context);
    }
    if (
      event.oldState === EventState.ACTIVE &&
      event.state === EventState.END &&
      handlers.onEnd
    ) {
      handlers.onEnd(event, context);
    }
    if (
      event.oldState === EventState.BEGAN &&
      event.state === EventState.FAILED &&
      handlers.onFail
    ) {
      handlers.onFail(event, context);
    }
    if (
      event.oldState === EventState.ACTIVE &&
      event.state === EventState.CANCELLED &&
      handlers.onCancel
    ) {
      handlers.onCancel(event, context);
    }
    if (
      (event.oldState === EventState.BEGAN ||
        event.oldState === EventState.ACTIVE) &&
      event.state !== EventState.BEGAN &&
      event.state !== EventState.ACTIVE &&
      handlers.onFinish
    ) {
      handlers.onFinish(
        event,
        context,
        event.state === EventState.CANCELLED ||
          event.state === EventState.FAILED
      );
    }
  };

  if (isWeb()) {
    return handler;
  }

  return useEvent<T>(
    handler,
    ['onGestureHandlerStateChange', 'onGestureHandlerEvent'],
    dependenciesDiffer
  );
}
