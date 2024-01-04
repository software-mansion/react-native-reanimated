'use strict';
import type { Component, MutableRefObject } from 'react';
import type { ShadowNodeWrapper, SharedValue } from '../commonTypes';
import type {
  ImageStyle,
  NativeSyntheticEvent,
  TextStyle,
  ViewStyle,
  NativeScrollEvent,
} from 'react-native';
import type { ViewDescriptorsSet, ViewRefSet } from '../ViewDescriptorsSet';
import type { AnimatedStyle } from '../helperTypes';

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

/**
 * In Native implementation `AnimatedRef` is mapped to a handle of this type.
 */
export type AnimatedRefOnUI = {
  viewName: SharedValue<string>;
  (): number | ShadowNodeWrapper | null;
};

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

export interface AnimatedStyleHandle<
  Style extends DefaultStyle = DefaultStyle
> {
  viewDescriptors: ViewDescriptorsSet;
  initial: {
    value: AnimatedStyle<Style>;
    updater: () => AnimatedStyle<Style>;
  };
  viewsRef: ViewRefSet<unknown>;
}

export interface JestAnimatedStyleHandle<
  Style extends DefaultStyle = DefaultStyle
> extends AnimatedStyleHandle<Style> {
  jestAnimatedStyle: MutableRefObject<AnimatedStyle<Style>>;
}
