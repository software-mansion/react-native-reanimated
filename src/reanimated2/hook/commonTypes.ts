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

export type ReanimatedEvent<Event extends object> = ReanimatedPayload &
  (Event extends {
    nativeEvent: infer NativeEvent extends object;
  }
    ? Omit<Event, 'nativeEvent'> & NativeEvent
    : Event);

export type NativeEventWrapper<Event extends object> = {
  nativeEvent: Event;
};

export type DefaultStyle = ViewStyle | ImageStyle | TextStyle;

export type RNNativeScrollEvent = NativeSyntheticEvent<NativeScrollEvent>;

export type ReanimatedScrollEvent = ReanimatedEvent<RNNativeScrollEvent>;
