import { Context, ShadowNodeWrapper } from '../commonTypes';

export type DependencyList = Array<unknown> | undefined;

export interface ContextWithDependencies<TContext extends Context> {
  context: TContext;
  savedDependencies: DependencyList;
}

export interface Descriptor {
  tag: number | null;
  name: string | null;
  shadowNodeWrapper: ShadowNodeWrapper | null;
}

export interface RefObjectFunction<T> {
  current: T | null;
  (component?: T): number | ShadowNodeWrapper;
}
