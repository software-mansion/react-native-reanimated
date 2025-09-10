import type { Maybe } from '../../../common';
import type { AnyRecord } from '../../types';
export type ValueProcessor<V> = (value: V) => Maybe<string> | Record<string, string>;
type ProcessedProps<P extends AnyRecord> = {
    [K in keyof P]: string;
};
export type StyleBuildHandler<P extends AnyRecord> = (props: ProcessedProps<P>, nameAliases: Record<string, string>) => string | null;
export type RuleBuildHandler<P extends AnyRecord> = (props: ProcessedProps<P>) => Record<string, string>;
type BuilderBase<P extends AnyRecord, R> = {
    add(property: keyof P, value: P[keyof P]): void;
    build(): R;
};
export type StyleBuilder<P extends AnyRecord> = BuilderBase<P, string | null> & {
    buildFrom(props: P): string | null;
};
export type RuleBuilder<P extends AnyRecord> = BuilderBase<P, Record<string, string>>;
type PropertyAlias<P extends AnyRecord> = {
    as: keyof P;
};
type PropertyValueConfigBase<P extends AnyRecord> = boolean | string | PropertyAlias<P>;
type StyleBuilderPropertyConfig<P extends AnyRecord, K extends keyof P = keyof P> = PropertyValueConfigBase<P> | RuleBuilder<P> | {
    process?: ValueProcessor<Required<P>[K]>;
    name?: string;
};
type RuleBuilderPropertyConfig<P extends AnyRecord, K extends keyof P = keyof P> = PropertyValueConfigBase<P> | {
    process: ValueProcessor<Required<P>[K]>;
};
export type StyleBuilderConfig<P extends AnyRecord> = {
    [K in keyof Required<P>]: StyleBuilderPropertyConfig<P, K>;
};
export type RuleBuilderConfig<P extends AnyRecord> = {
    [K in keyof Required<P>]: RuleBuilderPropertyConfig<P, K>;
};
export type AnyBuilderConfig<P extends AnyRecord> = StyleBuilderConfig<P> | RuleBuilderConfig<P>;
export {};
//# sourceMappingURL=types.d.ts.map