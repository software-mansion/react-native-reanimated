export type DependencyList = Array<unknown> | undefined;

export type Context = Record<string, unknown>;
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
