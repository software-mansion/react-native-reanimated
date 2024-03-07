'use strict';
import type {
  DependencyList,
  NativeEventWrapper,
  ReanimatedEvent,
} from './commonTypes';
import { useHandler } from './useHandler';
import { useEvent } from './useEvent';

const EVENT_TYPE = {
  UNDETERMINED: 0,
  FAILED: 1,
  BEGAN: 2,
  CANCELLED: 3,
  ACTIVE: 4,
  END: 5,
} as const;

type StateType = (typeof EVENT_TYPE)[keyof typeof EVENT_TYPE];

// This type comes from React Native Gesture Handler
// import type { PanGestureHandlerGestureEvent as DefaultEvent } from 'react-native-gesture-handler';
type DefaultEvent = {
  nativeEvent: {
    readonly handlerTag: number;
    readonly numberOfPointers: number;
    readonly state: (typeof EVENT_TYPE)[keyof typeof EVENT_TYPE];
    readonly x: number;
    readonly y: number;
    readonly absoluteX: number;
    readonly absoluteY: number;
    readonly translationX: number;
    readonly translationY: number;
    readonly velocityX: number;
    readonly velocityY: number;
  };
};

interface PropsUsedInUseAnimatedGestureHandler {
  handlerTag?: number;
  numberOfPointers?: number;
  state?: StateType;
  oldState?: StateType;
}

export type GestureHandlerEvent<Event extends object> =
  | ReanimatedEvent<Event>
  | Event;

type GestureHandler<
  Event extends NativeEventWrapper<PropsUsedInUseAnimatedGestureHandler>,
  Context extends Record<string, unknown>
> = (
  eventPayload: ReanimatedEvent<Event>,
  context: Context,
  isCanceledOrFailed?: boolean
) => void;

export interface GestureHandlers<
  Event extends NativeEventWrapper<PropsUsedInUseAnimatedGestureHandler>,
  Context extends Record<string, unknown>
> {
  [key: string]: GestureHandler<Event, Context> | undefined;
  onStart?: GestureHandler<Event, Context>;
  onActive?: GestureHandler<Event, Context>;
  onEnd?: GestureHandler<Event, Context>;
  onFail?: GestureHandler<Event, Context>;
  onCancel?: GestureHandler<Event, Context>;
  onFinish?: GestureHandler<Event, Context>;
}

/**
 * @deprecated useAnimatedGestureHandler is an old API which is no longer supported.
 *
 * Please check https://docs.swmansion.com/react-native-gesture-handler/docs/guides/upgrading-to-2/
 * for information about how to migrate to `react-native-gesture-handler` v2
 */
export function useAnimatedGestureHandler<
  Event extends NativeEventWrapper<PropsUsedInUseAnimatedGestureHandler> = DefaultEvent,
  Context extends Record<string, unknown> = Record<string, unknown>
>(handlers: GestureHandlers<Event, Context>, dependencies?: DependencyList) {
  type WebOrNativeEvent = Event | ReanimatedEvent<Event>;

  const { context, doDependenciesDiffer, useWeb } = useHandler<Event, Context>(
    handlers,
    dependencies
  );
  const handler = (e: WebOrNativeEvent) => {
    'worklet';
    const event = useWeb
      ? // On Web we get events straight from React Native and they don't have
        // the `eventName` field there. To simplify the types here we just
        // cast it as the field was available.
        ((e as Event).nativeEvent as ReanimatedEvent<Event>)
      : (e as ReanimatedEvent<Event>);

    if (event.state === EVENT_TYPE.BEGAN && handlers.onStart) {
      handlers.onStart(event, context);
    }
    if (event.state === EVENT_TYPE.ACTIVE && handlers.onActive) {
      handlers.onActive(event, context);
    }
    if (
      event.oldState === EVENT_TYPE.ACTIVE &&
      event.state === EVENT_TYPE.END &&
      handlers.onEnd
    ) {
      handlers.onEnd(event, context);
    }
    if (
      event.oldState === EVENT_TYPE.BEGAN &&
      event.state === EVENT_TYPE.FAILED &&
      handlers.onFail
    ) {
      handlers.onFail(event, context);
    }
    if (
      event.oldState === EVENT_TYPE.ACTIVE &&
      event.state === EVENT_TYPE.CANCELLED &&
      handlers.onCancel
    ) {
      handlers.onCancel(event, context);
    }
    if (
      (event.oldState === EVENT_TYPE.BEGAN ||
        event.oldState === EVENT_TYPE.ACTIVE) &&
      event.state !== EVENT_TYPE.BEGAN &&
      event.state !== EVENT_TYPE.ACTIVE &&
      handlers.onFinish
    ) {
      handlers.onFinish(
        event,
        context,
        event.state === EVENT_TYPE.CANCELLED ||
          event.state === EVENT_TYPE.FAILED
      );
    }
  };

  if (useWeb) {
    return handler;
  }

  // eslint-disable-next-line react-hooks/rules-of-hooks
  return useEvent<Event>(
    handler,
    ['onGestureHandlerStateChange', 'onGestureHandlerEvent'],
    doDependenciesDiffer
    // This is not correct but we want to make GH think it receives a function.
  ) as unknown as (e: Event) => void;
}
