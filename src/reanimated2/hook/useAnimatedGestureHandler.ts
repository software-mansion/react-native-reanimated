import { WorkletClosure, WorkletFunction, NativeEvent } from '../commonTypes';
import { DependencyList } from './commonTypes';
import { useEvent, useHandler } from './Hooks';

interface Handler<T, Context extends WorkletClosure> extends WorkletFunction {
  (event: T, context: Context, isCanceledOrFailed?: boolean): void;
}

export interface GestureHandlers<T, Context extends WorkletClosure> {
  [key: string]: Handler<T, Context> | undefined;
  onStart?: Handler<T, Context>;
  onActive?: Handler<T, Context>;
  onEnd?: Handler<T, Context>;
  onFail?: Handler<T, Context>;
  onCancel?: Handler<T, Context>;
  onFinish?: Handler<T, Context>;
}

export const EventType = {
  UNDETERMINED: 0,
  FAILED: 1,
  BEGAN: 2,
  CANCELLED: 3,
  ACTIVE: 4,
  END: 5,
};

export interface GestureHandlerNativeEvent {
  handlerTag: number;
  numberOfPointers: number;
  state: (typeof EventType)[keyof typeof EventType];
}

export type GestureHandlerEvent<T> = NativeEvent<T>;

// We want to make sure that useAnimatedGestureHandler's Payload generic type is
// within acceptable bounds. That's what this utility type is for.
type InferAnimatedGestureHandlerArgument<T> = T extends GestureHandlerEvent<
  infer E
>
  ? E extends GestureHandlerNativeEvent
    ? E
    : never
  : never;

export function useAnimatedGestureHandler<
  T extends GestureHandlerEvent<T>,
  Context extends WorkletClosure = WorkletClosure,
  Payload = InferAnimatedGestureHandlerArgument<T>
>(
  handlers: GestureHandlers<Payload, Context>,
  dependencies?: DependencyList
): (e: T) => void {
  const { context, doDependenciesDiffer, useWeb } = useHandler<
    Payload,
    Context
  >(handlers, dependencies);

  const handler = (e: T) => {
    'worklet';
    // It's surprisingly difficult to properly type 'event' here through generic arguments
    // of the function. However, since Payload is already doing that we decided
    // to drop the double check and just cast 'event' to any here.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const event = (useWeb ? e.nativeEvent : e) as any;

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
  ) as unknown as (e: T) => void; // This is not correct but we want to make GH think it receives a function.
}
