'use strict';
import type { Component, MutableRefObject } from 'react';
import type {
  ImageStyle,
  NativeScrollEvent,
  NativeSyntheticEvent,
  TextStyle,
  ViewStyle,
} from 'react-native';

import type {
  AnimatedPropsAdapterFunction,
  AnimatedStyle,
  ShadowNodeWrapper,
  SharedValue,
  WorkletFunction,
} from '../commonTypes';
import type { AnimatedProps } from '../createAnimatedComponent/commonTypes';
import type { ReanimatedHTMLElement } from '../ReanimatedModule/js-reanimated';
import type { ViewDescriptorsSet } from '../ViewDescriptorsSet';

export type DependencyList = Array<unknown> | undefined;

export interface Descriptor {
  tag: number | ReanimatedHTMLElement;
  name: string;
  shadowNodeWrapper: ShadowNodeWrapper;
}

export type MaybeObserverCleanup = (() => void) | undefined;

export type AnimatedRefObserver = (tag: number | null) => MaybeObserverCleanup;

export interface AnimatedRef<T extends Component> {
  (component?: T):
    | number // Paper
    | ShadowNodeWrapper // Fabric
    | HTMLElement; // web
  current: T | null;
  observe: (observer: AnimatedRefObserver) => void;
  getTag?: () => number | null;
}

// Might make that type generic if it's ever needed.
export type AnimatedRefOnJS = AnimatedRef<Component>;

/** `AnimatedRef` is mapped to this type on the UI thread via a shareable handle. */
export type AnimatedRefOnUI = {
  (): number | ShadowNodeWrapper | null;
  /**
   * @remarks
   *   `viewName` is required only on iOS/macOS with Paper and is undefined on
   *   other platforms
   */
  viewName?: SharedValue<string | null>;
};

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

export type NativeEventWrapper<Event extends object> = {
  nativeEvent: Event;
};

export type DefaultStyle = ViewStyle | ImageStyle | TextStyle;

export type RNNativeScrollEvent = NativeSyntheticEvent<NativeScrollEvent>;

export type ReanimatedScrollEvent = ReanimatedEvent<RNNativeScrollEvent>;

export interface IWorkletEventHandler<Event extends object> {
  updateEventHandler: (
    newWorklet: (event: ReanimatedEvent<Event>) => void,
    newEvents: string[]
  ) => void;
  registerForEvents: (viewTag: number, fallbackEventName?: string) => void;
  unregisterFromEvents: (viewTag: number) => void;
}

export interface AnimatedStyleHandle<
  Style extends DefaultStyle | AnimatedProps = DefaultStyle,
> {
  viewDescriptors: ViewDescriptorsSet;
  initial: {
    value: AnimatedStyle<Style>;
    updater: () => AnimatedStyle<Style>;
  };
}

export interface JestAnimatedStyleHandle<
  Style extends DefaultStyle | AnimatedProps = DefaultStyle,
> extends AnimatedStyleHandle<Style> {
  jestAnimatedValues:
    | MutableRefObject<AnimatedStyle<Style>>
    | MutableRefObject<AnimatedProps>;
  toJSON: () => string;
}

export type UseAnimatedStyleInternal<Style extends DefaultStyle> = (
  updater: WorkletFunction<[], Style> | (() => Style),
  dependencies?: DependencyList | null,
  adapters?:
    | AnimatedPropsAdapterFunction
    | AnimatedPropsAdapterFunction[]
    | null,
  isAnimatedProps?: boolean
) => AnimatedStyleHandle<Style> | JestAnimatedStyleHandle<Style>;
