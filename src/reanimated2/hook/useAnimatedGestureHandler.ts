import { Context, WorkletFunction, NativeEvent } from '../commonTypes';
import { DependencyList } from './commonTypes';
import { useEvent, useHandler } from './Hooks';

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

export enum EventType {
  UNDETERMINED = 0,
  FAILED,
  BEGAN,
  CANCELLED,
  ACTIVE,
  END,
}

export interface GestureHandlerEvent<T> extends NativeEvent<T> {
  nativeEvent: T;
}

type InferArgument<T> = T extends GestureHandlerEvent<infer E> ? E : never;

export function useAnimatedGestureHandler<
  T extends GestureHandlerEvent<any>,
  TContext extends Context = Context,
  Payload = InferArgument<T>
>(
  handlers: GestureHandlers<Payload, TContext>,
  dependencies?: DependencyList
): (e: T) => void {
  const { context, doDependenciesDiffer, useWeb } = useHandler<
    Payload,
    TContext
  >(handlers, dependencies);

  const handler = (e: T) => {
    'worklet';
    const event = useWeb ? e.nativeEvent : e;

    if (event.state === EventType.BEGAN && handlers.onStart) {
      handlers.onStart(event, context);
    }
    if (event.state === EventType.ACTIVE && handlers.onActive) {
      handlers.onActive(event, context);
    }
    if (
      event.oldState === EventType.ACTIVE &&
      event.state === EventType.END &&
      handlers.onEnd
    ) {
      handlers.onEnd(event, context);
    }
    if (
      event.oldState === EventType.BEGAN &&
      event.state === EventType.FAILED &&
      handlers.onFail
    ) {
      handlers.onFail(event, context);
    }
    if (
      event.oldState === EventType.ACTIVE &&
      event.state === EventType.CANCELLED &&
      handlers.onCancel
    ) {
      handlers.onCancel(event, context);
    }
    if (
      (event.oldState === EventType.BEGAN ||
        event.oldState === EventType.ACTIVE) &&
      event.state !== EventType.BEGAN &&
      event.state !== EventType.ACTIVE &&
      handlers.onFinish
    ) {
      handlers.onFinish(
        event,
        context,
        event.state === EventType.CANCELLED || event.state === EventType.FAILED
      );
    }
  };

  if (useWeb) {
    return handler;
  }

  return useEvent<T>(
    handler,
    ['onGestureHandlerStateChange', 'onGestureHandlerEvent'],
    doDependenciesDiffer
  ) as unknown as (e: T) => void; // this is not correct but we want to make GH think it receives a function
}
