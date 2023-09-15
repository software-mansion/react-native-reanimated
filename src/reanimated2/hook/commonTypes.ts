'use strict';
import type { Component } from 'react';
import type { ShadowNodeWrapper } from '../commonTypes';
import type {
  ImageStyle,
  NativeSyntheticEvent,
  TextStyle,
  ViewStyle,
  NativeScrollEvent,
} from 'react-native';

export type DependencyList = Array<unknown> | undefined;

export interface Descriptor {
  tag: number;
  name: string;
  shadowNodeWrapper: ShadowNodeWrapper;
}

export interface AnimatedRef<T extends Component> {
  current: T | null;
  (component?: T):
    | number // Paper
    | ShadowNodeWrapper // Fabric
    | HTMLElement; // web
}

type ReanimatedPayload = {
  eventName: string;
};

/**
 * This utility type is to convert type of events that would normally be
 * sent by React Native (they have `nativeEvent` field) to the type
 * that is sent by Reanimated.
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

export type NativeEventWrapper<Event extends object> = {
  nativeEvent: Event;
};

export type DefaultStyle = ViewStyle | ImageStyle | TextStyle;

export type RNNativeScrollEvent = NativeSyntheticEvent<NativeScrollEvent>;

export type ReanimatedScrollEvent = ReanimatedEvent<RNNativeScrollEvent>;
