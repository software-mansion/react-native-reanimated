export type DependencyList = Array<any> | undefined;

export interface DependencyObject {
  workletHash: number;
  closure: Record<string, any>;
}

export interface SharedValue<T> {
  value: T;
}

export interface WorkletFunction {
  _closure?: Record<string, any>;
  __workletHash?: number;
}

export interface BasicWorkletFunction<T> extends WorkletFunction {
  (): T;
}
