'use strict';

import type { AnyRecord } from 'dns';
import type { ComponentRef } from 'react';
import type {
  NativeMethods,
  ScrollResponderMixin,
  ScrollViewComponent,
  View,
} from 'react-native';

import type { Maybe } from '../common';
import type { ShadowNodeWrapper } from './nodes';

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

type NativeScrollRef = Maybe<
  (
    | ComponentRef<typeof View>
    | ComponentRef<typeof ScrollViewComponent>
    | NativeMethods
  ) & {
    __internalInstanceHandle?: AnyRecord;
  }
>;

type InstanceMethods = {
  getScrollResponder?: () => Maybe<
    (ScrollResponderMixin | React.JSX.Element) & {
      getNativeScrollRef?: () => NativeScrollRef;
    }
  >;
  getNativeScrollRef?: () => NativeScrollRef;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getScrollableNode?: () => any;
  __internalInstanceHandle?: AnyRecord;
};

export type WrapperRef = (React.Component & InstanceMethods) | InstanceMethods;
