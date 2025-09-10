export type Maybe<T> = T | null | undefined;
export type ValueProcessor<V, R = V> = (value: V) => Maybe<R>;
export type TransformOrigin = string | Array<string | number>;
export type NormalizedTransformOrigin = [
    `${number}%` | number,
    `${number}%` | number,
    number
];
//# sourceMappingURL=types.d.ts.map