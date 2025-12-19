'use strict';
import type { UnknownRecord } from '../../types';
import { createWebPropsBuilder } from './propsBuilder';
import type { PropsBuilderConfig } from './types';
import { createRegistry } from '../../registry/createRegistry';
import webPropsBuilder from './propsBuilder';

export { ERROR_MESSAGES } from '../../registry/createRegistry';

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
