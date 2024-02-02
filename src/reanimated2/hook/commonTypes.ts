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
  (component?: T):
    | number // Paper
    | ShadowNodeWrapper // Fabric
    | HTMLElement; // web
  current: T | null;
}

// Might make that type generic if it's ever needed.
export type AnimatedRefOnJS = AnimatedRef<Component>;

/**
 * `AnimatedRef` is mapped to this type on the UI thread via a shareable handle.
 */
export type AnimatedRefOnUI = {
  (): number | ShadowNodeWrapper | null;
  /**
   * @remarks `viewName` is required only on iOS with Paper and it's value is null on other platforms.
   */
  viewName: SharedValue<string | null>;
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
  /**
   * @remarks `viewsRef` is only defined in Web implementation.
   */
  viewsRef: ViewRefSet<unknown> | undefined;
}

export interface JestAnimatedStyleHandle<
  Style extends DefaultStyle = DefaultStyle
> extends AnimatedStyleHandle<Style> {
  jestAnimatedStyle: MutableRefObject<AnimatedStyle<Style>>;
}
