import type { AnyRecord } from '../../../types';
import type { BuildHandler, StyleBuilder, StyleBuilderConfig } from './types';
export default function createStyleBuilder<P extends AnyRecord>(config: StyleBuilderConfig<P>, buildHandler?: BuildHandler<P>): StyleBuilder<Partial<P>>;
//# sourceMappingURL=builderFactory.d.ts.map