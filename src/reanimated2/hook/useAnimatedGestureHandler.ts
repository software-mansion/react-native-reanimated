import { MutableRefObject, useEffect, useRef } from 'react';
import { GestureHandlerStateChangeNativeEvent } from 'react-native-gesture-handler';
import { makeRemote } from '../core';
import { isWeb } from '../PlatformChecker';
import WorkletEventHandler from '../WorkletEventHandler';
import {
  Context,
  ContextWithDependencies,
  DependencyList,
  WorkletFunction,
} from './commonTypes';
import { areDependenciesEqual, buildDependencies, useEvent } from './utils';

interface Handler<T, TContext extends Context> extends WorkletFunction {
  (event: T, context: TContext, isCanceledOrFailed?: boolean): void;
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

    const FAILED = 1;
    const BEGAN = 2;
    const CANCELLED = 3;
    const ACTIVE = 4;
    const END = 5;

    if (event.state === BEGAN && handlers.onStart) {
      handlers.onStart(event, context);
    }
    if (event.state === ACTIVE && handlers.onActive) {
      handlers.onActive(event, context);
    }
    if (event.oldState === ACTIVE && event.state === END && handlers.onEnd) {
      handlers.onEnd(event, context);
    }
    if (event.oldState === BEGAN && event.state === FAILED && handlers.onFail) {
      handlers.onFail(event, context);
    }
    if (
      event.oldState === ACTIVE &&
      event.state === CANCELLED &&
      handlers.onCancel
    ) {
      handlers.onCancel(event, context);
    }
    if (
      (event.oldState === BEGAN || event.oldState === ACTIVE) &&
      event.state !== BEGAN &&
      event.state !== ACTIVE &&
      handlers.onFinish
    ) {
      handlers.onFinish(
        event,
        context,
        event.state === CANCELLED || event.state === FAILED
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
