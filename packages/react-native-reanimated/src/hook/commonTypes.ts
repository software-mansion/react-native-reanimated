'use strict';
import type { ComponentRef, ElementType, RefObject } from 'react';
import type {
  HostInstance,
  ImageStyle,
  NativeScrollEvent,
  NativeSyntheticEvent,
  TextStyle,
  ViewStyle,
} from 'react-native';
import type { WorkletFunction } from 'react-native-worklets';

import type { Maybe } from '../common';
import type {
  AnimatedPropsAdapterFunction,
  AnimatedStyle,
  InstanceOrElement,
  InternalHostInstance,
  ShadowNodeWrapper,
  StyleUpdaterContainer,
} from '../commonTypes';
import type {
  AnimatedComponentType,
  AnimatedProps,
} from '../createAnimatedComponent';
import type { ReanimatedHTMLElement } from '../ReanimatedModule/js-reanimated';
import type { ViewDescriptorsSet } from '../ViewDescriptorsSet';

export type DependencyList = Array<unknown> | undefined;

export interface Descriptor {
  tag: number | ReanimatedHTMLElement;
  shadowNodeWrapper: ShadowNodeWrapper;
}

export type MaybeObserverCleanup = (() => void) | undefined;

export type AnimatedRefObserver = (tag: number | null) => MaybeObserverCleanup;

export type ExtractElementRef<TRef> = TRef extends ElementType
  ? ComponentRef<TRef> extends never // Ensure that ref type is explicitly defined (is not any)
    ? TRef
    : ComponentRef<TRef>
  : TRef;

// TODO - Replace InstanceOrElement with InternalHostInstance once we drop support for the old
// types and migrate to the new react-native-strict-api types to align with the useRef type.
// For now, we need to support the old useAnimatedRef API as well, which uses the ElementType
// as the type of the ref.
type AnimatedRefCurrent<TRef> = ExtractElementRef<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  TRef extends AnimatedComponentType<any, infer Instance> ? Instance : TRef
>;

export type AnimatedRef<TRef extends InstanceOrElement = HostInstance> = {
  (ref?: AnimatedRefCurrent<TRef> | null):
    | ShadowNodeWrapper // Native
    | HTMLElement; // web
  current: AnimatedRefCurrent<TRef> | null;
  observe: (observer: AnimatedRefObserver) => void;
  getTag?: () => Maybe<number>;
};

// Might make that type generic if it's ever needed.
export type AnimatedRefOnJS = AnimatedRef<InternalHostInstance>;

/**
 * `AnimatedRef` is mapped to this type on the UI thread via a serializable
 * handle.
 */
export type AnimatedRefOnUI = {
  (): number | ShadowNodeWrapper | null;
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
  styleUpdaterContainer: StyleUpdaterContainer;
}

export interface JestAnimatedStyleHandle<
  Style extends DefaultStyle | AnimatedProps = DefaultStyle,
> extends AnimatedStyleHandle<Style> {
  jestAnimatedValues:
    | RefObject<AnimatedStyle<Style>>
    | RefObject<AnimatedProps>;
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
