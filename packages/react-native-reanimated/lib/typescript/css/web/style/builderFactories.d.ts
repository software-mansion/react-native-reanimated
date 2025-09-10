import type { AnyRecord } from '../../types';
import type { RuleBuilder, RuleBuilderConfig, RuleBuildHandler, StyleBuilder, StyleBuilderConfig, StyleBuildHandler } from './types';
export declare function createStyleBuilder<P extends AnyRecord>(config: StyleBuilderConfig<P>, buildHandler?: StyleBuildHandler<P>): StyleBuilder<Partial<P>>;
export declare function createRuleBuilder<P extends AnyRecord>(config: RuleBuilderConfig<P>, buildHandler: RuleBuildHandler<P>): RuleBuilder<Partial<P>>;
//# sourceMappingURL=builderFactories.d.ts.map