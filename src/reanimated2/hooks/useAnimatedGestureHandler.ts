import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { makeRemote } from '../core';
import { areDependenciesEqual, buildDependencies, useEvent } from './utils';

export function useAnimatedGestureHandler(handlers, dependencies) {
  const initRef = useRef(null);
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

  const handler = (event) => {
    'worklet';
    event = Platform.OS === 'web' ? event.nativeEvent : event;

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

  if (Platform.OS === 'web') {
    return handler;
  }

  return useEvent(
    handler,
    ['onGestureHandlerStateChange', 'onGestureHandlerEvent'],
    dependenciesDiffer
  );
}
