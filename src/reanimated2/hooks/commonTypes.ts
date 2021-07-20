import { TextStyle, ViewStyle } from 'react-native';

export type DependencyList = Array<any> | undefined;

export type Context = Record<string, unknown>;

export interface DependencyObject {
  workletHash: number;
  closure: Context;
}

export interface SharedValue<T> {
  value: T;
}

export interface WorkletFunction {
  _closure?: Context;
  __workletHash?: number;
  __optimalization?: number;
}

export interface BasicWorkletFunction<T> extends WorkletFunction {
  (): T;
}

export interface ContextWithDependencies<TContext extends Context> {
  context: TContext;
  savedDependencies: DependencyList;
}

// section to delete after merge with typescript for animation
export type StyleProps =
  | ViewStyle
  | TextStyle
  | { originX?: number; originY?: number };

export type AnimatedStyle =
  | Record<string, Animation<AnimationObject>>
  | { transform: Record<string, Animation<AnimationObject>>[] };

export type PrimitiveValue = number | string;
export interface NumericAnimation {
  current?: number;
}
export interface AnimationObject {
  callback: AnimationCallback;
  current?: PrimitiveValue;
  toValue?: AnimationObject['current'];
  startValue?: AnimationObject['current'];
  finished?: boolean;

  __prefix?: string;
  __suffix?: string;
  onFrame: (animation: any, timestamp: Timestamp) => boolean;
  onStart: (
    nextAnimation: any,
    current: any,
    timestamp: Timestamp,
    previousAnimation: any
  ) => void;
}

export type AnimationCallback = (
  finished?: boolean,
  current?: PrimitiveValue
) => void;

export type Timestamp = number;

export interface Animation<T extends AnimationObject> extends AnimationObject {
  onFrame: (animation: T, timestamp: Timestamp) => boolean;
  onStart: (
    nextAnimation: T,
    current: T extends NumericAnimation ? number : PrimitiveValue,
    timestamp: Timestamp,
    previousAnimation: T
  ) => void;
}

// end of section
export interface Descriptor {
  tag: number;
  name: string;
}
export interface AnimatedState {
  last: AnimatedStyle;
  animations: AnimationObject[];
  isAnimationRunning: boolean;
  isAnimationCancelled: boolean;
}
export interface AdapterWorkletFunction extends WorkletFunction {
  (value: AnimatedStyle): void;
}

export interface AnimationRef {
  initial: {
    value: AnimatedStyle;
  };
  remoteState: AnimatedState;
  sharableViewDescriptors: SharedValue<Descriptor[]>;
}
