import type { Component } from 'react';
import type { ShadowNodeWrapper } from '../commonTypes';
import type {
  ImageStyle,
  NativeSyntheticEvent,
  TextStyle,
  ViewStyle,
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

export type ReanimatedPayload<Payload extends object> = Payload & {
  eventName: string;
};

export type ReanimatedEvent<Payload extends object> = Payload;

export type RNEvent<Payload extends object> = NativeSyntheticEvent<Payload>;

export type DefaultStyle = ViewStyle | ImageStyle | TextStyle;
