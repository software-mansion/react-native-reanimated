'use strict';

import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';

type ReanimatedPayload = {
  eventName: string;
};

/**
 * This utility type is to convert type of events that would normally be sent by
 * React Native (they have `nativeEvent` field) to the type that is sent by
 * Reanimated.
 */
export type ReanimatedEvent<Event extends object> = ReanimatedPayload &
  (Event extends {
    nativeEvent: infer NativeEvent extends object;
  }
    ? NativeEvent
    : Event);

export type EventPayload<Event extends object> = Event extends {
  nativeEvent: infer NativeEvent extends object;
}
  ? NativeEvent
  : Omit<Event, 'eventName'>;

export type RNNativeScrollEvent = NativeSyntheticEvent<NativeScrollEvent>;
export type ReanimatedScrollEvent = ReanimatedEvent<RNNativeScrollEvent>;
