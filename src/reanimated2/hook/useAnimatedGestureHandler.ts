import type {
  WorkletClosure,
  NativeEvent,
  DevWorkletBase,
  ReleaseWorkletBase,
} from '../commonTypes';
import type { DependencyList } from './commonTypes';
import { useEvent, useHandler } from './Hooks';

interface DevGestureInnerHandler<T, TContext extends WorkletClosure>
  extends DevWorkletBase {
  (event: T, context: TContext, isCanceledOrFailed?: boolean): void;
}

interface ReleaseGestureInnerHandler<T, TContext extends WorkletClosure>
  extends ReleaseWorkletBase {
  (event: T, context: TContext, isCanceledOrFailed?: boolean): void;
}

interface DevGestureHandlers<T, TContext extends WorkletClosure> {
  [key: string]: DevGestureInnerHandler<T, TContext> | undefined;
  onStart?: DevGestureInnerHandler<T, TContext>;
  onActive?: DevGestureInnerHandler<T, TContext>;
  onEnd?: DevGestureInnerHandler<T, TContext>;
  onFail?: DevGestureInnerHandler<T, TContext>;
  onCancel?: DevGestureInnerHandler<T, TContext>;
  onFinish?: DevGestureInnerHandler<T, TContext>;
}

interface ReleaseGestureHandlers<T, TContext extends WorkletClosure> {
  [key: string]: ReleaseGestureInnerHandler<T, TContext> | undefined;
  onStart?: ReleaseGestureInnerHandler<T, TContext>;
  onActive?: ReleaseGestureInnerHandler<T, TContext>;
  onEnd?: ReleaseGestureInnerHandler<T, TContext>;
  onFail?: ReleaseGestureInnerHandler<T, TContext>;
  onCancel?: ReleaseGestureInnerHandler<T, TContext>;
  onFinish?: ReleaseGestureInnerHandler<T, TContext>;
}

export type GestureHandlers<T, TContext extends WorkletClosure> =
  | ReleaseGestureHandlers<T, TContext>
  | DevGestureHandlers<T, TContext>;

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

export interface GestureHandlerEvent<T> extends NativeEvent<T> {
  nativeEvent: T;
}

type InferArgument<T> = T extends GestureHandlerEvent<infer E>
  ? E extends GestureHandlerNativeEvent
    ? E
    : never
  : never;

export function useAnimatedGestureHandler<
  T extends GestureHandlerEvent<any>,
  TContext extends WorkletClosure = WorkletClosure,
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
