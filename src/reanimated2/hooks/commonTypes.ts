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
}

export interface BasicWorkletFunction<T> extends WorkletFunction {
  (): T;
}

export interface ContextWithDependencies<TContext extends Context> {
  context: TContext;
  savedDependencies: DependencyList;
}
