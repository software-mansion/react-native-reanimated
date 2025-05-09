import type { Maybe } from '../../../../common';
import type { AnyRecord, ConfigPropertyAlias } from '../../../types';
export type ValueProcessor<V, R = V> = (value: V) => Maybe<R> | Record<string, R>;
export type BuildHandler<P extends AnyRecord> = (props: P) => P;
export type StyleBuilder<P extends AnyRecord> = {
    add(property: keyof P, value: P[keyof P]): void;
    buildFrom(props: P): P | null;
};
type PropertyValueConfigBase<P extends AnyRecord> = boolean | ConfigPropertyAlias<P>;
type StyleBuilderPropertyConfig<P extends AnyRecord, K extends keyof P = keyof P> = PropertyValueConfigBase<P> | {
    process: ValueProcessor<Required<P>[K], any>;
};
export type StyleBuilderConfig<P extends AnyRecord> = {
    [K in keyof Required<P>]: StyleBuilderPropertyConfig<P, K>;
};
export {};
//# sourceMappingURL=types.d.ts.map