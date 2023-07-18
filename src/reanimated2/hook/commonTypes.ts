import type { WorkletClosure, ShadowNodeWrapper } from '../commonTypes';

export type DependencyList = Array<unknown> | undefined;

export interface ContextWithDependencies<TContext extends WorkletClosure> {
  context: TContext;
  savedDependencies: DependencyList;
}

export interface Descriptor {
  tag: number;
  name: string;
  shadowNodeWrapper: ShadowNodeWrapper;
}

export interface RefObjectFunction<T> {
  current: T | null;
  (component?: T):
    | number // Paper
    | ShadowNodeWrapper // Fabric
    | HTMLElement; // web
}

export type AnimatedRef<T> = RefObjectFunction<T>;
