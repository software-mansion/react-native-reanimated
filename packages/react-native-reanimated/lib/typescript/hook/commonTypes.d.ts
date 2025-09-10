import type { RefObject } from 'react';
import type { ImageStyle, NativeScrollEvent, NativeSyntheticEvent, TextStyle, ViewStyle } from 'react-native';
import type { WorkletFunction } from 'react-native-worklets';
import type { AnimatedPropsAdapterFunction, AnimatedStyle, ShadowNodeWrapper, StyleUpdaterContainer, WrapperRef } from '../commonTypes';
import type { AnimatedProps } from '../createAnimatedComponent/commonTypes';
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
    (ref?: TRef | null): ShadowNodeWrapper | HTMLElement;
    current: TRef | null;
    observe: (observer: AnimatedRefObserver) => void;
    getTag?: () => number | null;
};
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
export type ReanimatedEvent<Event extends object> = ReanimatedPayload & (Event extends {
    nativeEvent: infer NativeEvent extends object;
} ? NativeEvent : Event);
export type EventPayload<Event extends object> = Event extends {
    nativeEvent: infer NativeEvent extends object;
} ? NativeEvent : Omit<Event, 'eventName'>;
export type DefaultStyle = ViewStyle | ImageStyle | TextStyle;
export type RNNativeScrollEvent = NativeSyntheticEvent<NativeScrollEvent>;
export type ReanimatedScrollEvent = ReanimatedEvent<RNNativeScrollEvent>;
export interface IWorkletEventHandler<Event extends object> {
    updateEventHandler: (newWorklet: (event: ReanimatedEvent<Event>) => void, newEvents: string[]) => void;
    registerForEvents: (viewTag: number, fallbackEventName?: string) => void;
    unregisterFromEvents: (viewTag: number) => void;
}
export interface AnimatedStyleHandle<Style extends DefaultStyle | AnimatedProps = DefaultStyle> {
    viewDescriptors: ViewDescriptorsSet;
    initial: {
        value: AnimatedStyle<Style>;
        updater: () => AnimatedStyle<Style>;
    };
    styleUpdaterContainer: StyleUpdaterContainer;
}
export interface JestAnimatedStyleHandle<Style extends DefaultStyle | AnimatedProps = DefaultStyle> extends AnimatedStyleHandle<Style> {
    jestAnimatedValues: RefObject<AnimatedStyle<Style>> | RefObject<AnimatedProps>;
    toJSON: () => string;
}
export type UseAnimatedStyleInternal<Style extends DefaultStyle> = (updater: WorkletFunction<[], Style> | (() => Style), dependencies?: DependencyList | null, adapters?: AnimatedPropsAdapterFunction | AnimatedPropsAdapterFunction[] | null, isAnimatedProps?: boolean) => AnimatedStyleHandle<Style> | JestAnimatedStyleHandle<Style>;
export {};
//# sourceMappingURL=commonTypes.d.ts.map