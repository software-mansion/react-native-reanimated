'use strict';
import { createRegistry } from '../../registry';
import type { UnknownRecord } from '../../types';
import webPropsBuilder, { createWebPropsBuilder } from './propsBuilder';
import type { PropsBuilderConfig } from './types';

export { ERROR_MESSAGES } from '../../registry';

type WebPropsBuilder = {
  build(props: UnknownRecord): string | null;
};

export const registry = createRegistry<WebPropsBuilder>({
  basePropsBuilder: webPropsBuilder,
});

export function registerComponentPropsBuilder<P extends UnknownRecord>(
  componentName: string,
  config: PropsBuilderConfig<P>
) {
  const builder = createWebPropsBuilder(config);
  registry.registerBuilder(componentName, builder);
}
