'use strict';
import type { RefObject } from 'react';
import type {
  ImageStyle,
  NativeScrollEvent,
  NativeSyntheticEvent,
  TextStyle,
  ViewStyle,
} from 'react-native';

import type {
  AnimatableValue,
  AnimationObject,
  AnimationsRecord,
  NestedObject,
  NestedObjectValues,
  ShadowNodeWrapper,
  WrapperRef,
} from '../commonTypes';
import type { AnyRecord, UnknownRecord } from '../css/types';
import type { ReanimatedHTMLElement } from '../ReanimatedModule/js-reanimated';
import type { ViewDescriptorsSet } from '../ViewDescriptorsSet';

export type DependencyList = Array<unknown> | undefined;

export interface Descriptor {
  tag: number | ReanimatedHTMLElement;
  shadowNodeWrapper: ShadowNodeWrapper;
}

export type MaybeObserverCleanup = (() => void) | undefined;

export type AnimatedRefObserver = (tag: number | null) => MaybeObserverCleanup;

export type AnimatedRef<TRef extends WrapperRef> = {
  (ref?: TRef | null):
    | ShadowNodeWrapper // Native
    | HTMLElement; // web
  current: TRef | null;
  observe: (observer: AnimatedRefObserver) => void;
  getTag?: () => number | null;
};

// Might make that type generic if it's ever needed.
export type AnimatedRefOnJS = AnimatedRef<WrapperRef>;

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

export type AnimatedValuesUpdate = NestedObject<
  AnimationObject | AnimatableValue
>;

export type AnimatedUpdaterHandle<TValues extends object = UnknownRecord> = {
  viewDescriptors: ViewDescriptorsSet;
  initial: {
    value: TValues;
    updater: () => AnimatedValuesUpdate;
  };
};

export type AnimatedStyleHandle<TStyle extends DefaultStyle = DefaultStyle> =
  AnimatedUpdaterHandle<TStyle>;

export type AnimatedPropsHandle<TProps extends object = UnknownRecord> =
  AnimatedUpdaterHandle<TProps>;

export type JestAnimatedUpdaterHandle<
  TValues extends AnyRecord = UnknownRecord,
> = AnimatedUpdaterHandle<TValues> & {
  jestAnimatedValues: RefObject<TValues>;
  toJSON: () => string;
};
