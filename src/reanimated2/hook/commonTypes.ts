import { WorkletClosure, ShadowNodeWrapper } from '../commonTypes';

export type DependencyList = Array<unknown> | undefined;

export interface ContextWithDependencies<Context extends WorkletClosure> {
  context: Context;
  savedDependencies: DependencyList;
}

export interface Descriptor {
  tag: number;
  name: string;
  shadowNodeWrapper: ShadowNodeWrapper;
}

export interface RefObjectFunction<T> {
  current: T | null;
  (component?: T): number;
}
