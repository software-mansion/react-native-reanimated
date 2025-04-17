export type Maybe<T> = T | null | undefined;

export type ValueProcessor<V, R = V> = (
  value: V
) => Maybe<R> | Record<string, R>;
