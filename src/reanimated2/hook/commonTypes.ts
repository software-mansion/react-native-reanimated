import { AnimationObject } from '../animation';
import { AnimatedStyle } from '../commonTypes';

export type DependencyList = Array<unknown> | undefined;

export type Context = Record<string, unknown>;
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
