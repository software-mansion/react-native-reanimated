'use strict';
import type { UnknownRecord } from '../../../common';
import {
  createWebPropsBuilder,
  type PropsBuilderConfig,
  type WebPropsBuilder,
} from '../../../common/web';

const PROPS_BUILDERS = new Map<string, WebPropsBuilder>();
const PATTERN_PROPS_BUILDERS: Array<{
  matcher: RegExp | ((name: string) => boolean);
  builder: WebPropsBuilder;
}> = [];

function findBuilder(componentName: string): WebPropsBuilder | null {
  const exact = PROPS_BUILDERS.get(componentName);
  if (exact) {
    return exact;
  }

  // Pattern matches in registration order
  for (const { matcher, builder } of PATTERN_PROPS_BUILDERS) {
    const matches =
      matcher instanceof RegExp
        ? matcher.test(componentName)
        : matcher(componentName);
    if (matches) {
      return builder;
    }
  }

  return null;
}

export function getWebSvgPropsBuilder(
  componentName: string
): WebPropsBuilder | null {
  return findBuilder(componentName);
}

export function registerWebSvgPropsBuilder<P extends UnknownRecord>(
  componentName: string | RegExp | ((name: string) => boolean),
  config: PropsBuilderConfig<P>
): void {
  const builder = createWebPropsBuilder(config);

  if (typeof componentName === 'string') {
    PROPS_BUILDERS.set(componentName, builder);
  } else {
    PATTERN_PROPS_BUILDERS.push({ matcher: componentName, builder });
  }
}
