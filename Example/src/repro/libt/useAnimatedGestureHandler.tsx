import { useRef, useCallback } from 'react';
import { Platform } from 'react-native';
import {
  makeRemote,
  useEvent,
} from 'react-native-reanimated';
import { GestureHandlerGestureEvent } from 'react-native-gesture-handler';

function useRemoteContext<T extends object>(initialValue: T) {
  const initRef = useRef<{ context: T } | null>(null);
  if (initRef.current === null) {
    initRef.current = {
      context: makeRemote(initialValue ?? {}),
    };
  }
  const { context } = initRef.current;

  return context;
}

function diff(context: any, name: string, value: any) {
  'worklet';

  if (!context.___diffs) {
    context.___diffs = {};
  }

  if (!context.___diffs[name]) {
    context.___diffs[name] = {
      stash: 0,
      prev: null,
    };
  }

  const d = context.___diffs[name];

  d.stash = d.prev !== null ? value - d.prev : 0;
  d.prev = value;

  return d.stash;
}

type Context = { [key: string]: any };
type Handler<T, TContext extends Context> = (
  event: T,
  context: TContext,
) => void;
type ReturnHandler<T, TContext extends Context, R> = (
  event: T,
  context: TContext,
) => R;

interface GestureHandlers<T, TContext extends Context> {
  onInit?: Handler<T, TContext>;
  onEvent?: Handler<T, TContext>;
  shouldHandleEvent?: ReturnHandler<T, TContext, boolean>;
  onGesture?: Handler<T, TContext>;
  beforeEach?: Handler<T, TContext>;
  afterEach?: Handler<T, TContext>;
  onStart?: Handler<T, TContext>;
  onActive?: Handler<T, TContext>;
  onEnd?: Handler<T, TContext>;
  onFail?: Handler<T, TContext>;
  onCancel?: Handler<T, TContext>;
  onFinish?: (
    event: T,
    context: TContext,
    isCanceledOrFailed: boolean,
  ) => void;
}

type OnGestureEvent<T extends GestureHandlerGestureEvent> = (event: T) => void;

export function createAnimatedGestureHandler<
  T extends GestureHandlerGestureEvent,
  TContext extends Context
>(handlers: GestureHandlers<T['nativeEvent'], TContext>) {
  const context = useRemoteContext<any>({
    __initialized: false,
  });
  const isAndroid = Platform.OS === 'android';

  const handler = (event: T['nativeEvent']) => {
    'worklet';

    // const UNDETERMINED = 0;
    const FAILED = 1;
    const BEGAN = 2;
    const CANCELLED = 3;
    const ACTIVE = 4;
    const END = 5;

    if (handlers.onInit && !context.__initialized) {
      context.__initialized = true;
      handlers.onInit(event, context);
    }

    if (handlers.onGesture) {
      handlers.onGesture(event, context);
    }

    const stateDiff = diff(context, 'pinchState', event.state);

    const pinchBeganAndroid =
      stateDiff === ACTIVE - BEGAN ? event.state === ACTIVE : false;

    const isBegan = isAndroid
      ? pinchBeganAndroid
      : event.state === BEGAN;

    if (isBegan) {
      if (handlers.shouldHandleEvent) {
        context._shouldSkip = !handlers.shouldHandleEvent(
          event,
          context,
        );
      } else {
        context._shouldSkip = false;
      }
    } else if (typeof context._shouldSkip === 'undefined') {
      return;
    }

    if (!context._shouldSkip) {
      if (handlers.onEvent) {
        handlers.onEvent(event, context);
      }

      if (handlers.beforeEach) {
        handlers.beforeEach(event, context);
      }

      if (isBegan && handlers.onStart) {
        handlers.onStart(event, context);
      }

      if (event.state === ACTIVE && handlers.onActive) {
        handlers.onActive(event, context);
      }
      if (
        // @ts-ignore
        event.oldState === ACTIVE &&
        event.state === END &&
        handlers.onEnd
      ) {
        handlers.onEnd(event, context);
      }
      if (
        // @ts-ignore
        event.oldState === ACTIVE &&
        event.state === FAILED &&
        handlers.onFail
      ) {
        handlers.onFail(event, context);
      }
      if (
        // @ts-ignore
        event.oldState === ACTIVE &&
        event.state === CANCELLED &&
        handlers.onCancel
      ) {
        handlers.onCancel(event, context);
      }
      // @ts-ignore
      if (event.oldState === ACTIVE) {
        if (handlers.onFinish) {
          handlers.onFinish(
            event,
            context,
            event.state === CANCELLED || event.state === FAILED,
          );
        }
      }

      if (handlers.afterEach) {
        handlers.afterEach(event, context);
      }
    }
    // @ts-ignore
    if (event.oldState === ACTIVE) {
      context._shouldSkip = undefined;
    }
  };

  return handler;
}

export function useAnimatedGestureHandler<
  T extends GestureHandlerGestureEvent,
  TContext extends Context
>(
  handlers: GestureHandlers<T['nativeEvent'], TContext>,
): OnGestureEvent<T> {
  const handler = useCallback(
    createAnimatedGestureHandler<T, TContext>(handlers),
    [],
  );

  // @ts-ignore
  return useEvent(
    handler,
    ['onGestureHandlerStateChange', 'onGestureHandlerEvent'],
    false,
  );
}
