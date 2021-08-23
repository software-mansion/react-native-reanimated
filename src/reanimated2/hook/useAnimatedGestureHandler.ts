import { MutableRefObject, useEffect, useRef } from 'react';
import {
  GestureHandlerStateChangeNativeEvent,
  State,
} from 'react-native-gesture-handler';
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

    if (event.state === State.BEGAN && handlers.onStart) {
      handlers.onStart(event, context);
    }
    if (event.state === State.ACTIVE && handlers.onActive) {
      handlers.onActive(event, context);
    }
    if (
      event.oldState === State.ACTIVE &&
      event.state === State.END &&
      handlers.onEnd
    ) {
      handlers.onEnd(event, context);
    }
    if (
      event.oldState === State.BEGAN &&
      event.state === State.FAILED &&
      handlers.onFail
    ) {
      handlers.onFail(event, context);
    }
    if (
      event.oldState === State.ACTIVE &&
      event.state === State.CANCELLED &&
      handlers.onCancel
    ) {
      handlers.onCancel(event, context);
    }
    if (
      (event.oldState === State.BEGAN || event.oldState === State.ACTIVE) &&
      event.state !== State.BEGAN &&
      event.state !== State.ACTIVE &&
      handlers.onFinish
    ) {
      handlers.onFinish(
        event,
        context,
        event.state === State.CANCELLED || event.state === State.FAILED
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
