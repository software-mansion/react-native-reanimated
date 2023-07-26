import type { WebEvent, NativeEvent } from '../commonTypes';
import type { DependencyList } from './commonTypes';
import { useEvent, useHandler } from './Hooks';
import { PanGestureHandlerGestureEvent } from 'react-native-gesture-handler';

const EventType = {
  UNDETERMINED: 0,
  FAILED: 1,
  BEGAN: 2,
  CANCELLED: 3,
  ACTIVE: 4,
  END: 5,
};

type StateType = (typeof EventType)[keyof typeof EventType];
interface PropsUsedInUseAnimatedGestureHandler {
  handlerTag?: number;
  numberOfPointers?: number;
  state?: StateType;
  oldState?: StateType;
}

export type GestureHandlerEvent<Payload extends object> =
  | WebEvent<Payload>
  | NativeEvent<Payload>;

type HandlerArguments<
  Payload extends PropsUsedInUseAnimatedGestureHandler,
  Context extends Record<string, unknown>
> = [event: Payload, context: Context, isCanceledOrFailed?: boolean];

type Handler<
  Payload extends PropsUsedInUseAnimatedGestureHandler,
  Context extends Record<string, unknown>
> = (...args: HandlerArguments<Payload, Context>) => void;

export interface GestureHandlers<
  Payload extends PropsUsedInUseAnimatedGestureHandler,
  Context extends Record<string, unknown>
> {
  [key: string]: Handler<Payload, Context> | undefined;
  onStart?: Handler<Payload, Context>;
  onActive?: Handler<Payload, Context>;
  onEnd?: Handler<Payload, Context>;
  onFail?: Handler<Payload, Context>;
  onCancel?: Handler<Payload, Context>;
  onFinish?: Handler<Payload, Context>;
}

// useAnimatedGestureHandler is generized by event types coming from RNGH
// and they all have those events defined as having nativeEvent field
// therefore we use this type to signify that
type RNGHProvidedType<Payload extends object> = {
  nativeEvent: Payload;
};

// we have to get to event's Payload
type InferPayload<EventType extends object> = EventType extends {
  nativeEvent: infer Payload extends object;
}
  ? Payload
  : never;

// and then we have to mark it that events we get
// contain all the necessary fields for us
type GestureHandlersPayload<
  EventType extends RNGHProvidedType<InferPayload<EventType>>
> = InferPayload<EventType> & PropsUsedInUseAnimatedGestureHandler;

/**
 * @deprecated useAnimatedGestureHandler is an old API which is no longer supported.
 *
 * Please check https://docs.swmansion.com/react-native-gesture-handler/docs/guides/upgrading-to-2/
 * for information about how to migrate to `react-native-gesture-handler` v2
 */
export function useAnimatedGestureHandler<
  EventType extends RNGHProvidedType<
    InferPayload<EventType>
  > = PanGestureHandlerGestureEvent,
  HandlerContext extends Record<string, unknown> = Record<string, unknown>
>(
  handlers: GestureHandlers<GestureHandlersPayload<EventType>, HandlerContext>,
  dependencies?: DependencyList
) {
  const { context, doDependenciesDiffer, useWeb } = useHandler<
    GestureHandlersPayload<EventType>,
    HandlerContext
  >(handlers, dependencies);
  const handler = (
    e: GestureHandlerEvent<GestureHandlersPayload<EventType>>
  ) => {
    'worklet';
    const event = useWeb
      ? (e as WebEvent<GestureHandlersPayload<EventType>>).nativeEvent
      : (e as NativeEvent<GestureHandlersPayload<EventType>>);

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

  return useEvent<GestureHandlerEvent<GestureHandlersPayload<EventType>>>(
    handler,
    ['onGestureHandlerStateChange', 'onGestureHandlerEvent'],
    doDependenciesDiffer
  ) as unknown as (e: EventType) => void;
  // This cast is necessary since RNGH expects to get a function
  // and useEvent returns a ref that is casted to something else x_x
}
