import type { AnyRecord } from '../../types';
import { hasSuffix, kebabize } from '../utils';
import type {
  PropertyAlias,
  StyleBuilder,
  AnyBuilderPropertiesConfig,
  StyleBuilderConfig,
  BuildHandler,
} from './types';

const isPropertyAlias = <P extends AnyRecord>(
  value: unknown
): value is PropertyAlias<P> =>
  typeof value === 'object' && value !== null && 'as' in value;

class StyleBuilderImpl<P extends AnyRecord> implements StyleBuilder<P> {
  private readonly buildHandler: BuildHandler<P>;

  protected readonly config: AnyBuilderPropertiesConfig<P>;

  protected processedProps = {} as Record<keyof P, string>;
  protected nameAliases = {} as Record<keyof P, string>;

  constructor(
    config: AnyBuilderPropertiesConfig<P>,
    buildHandler: BuildHandler<P>
  ) {
    this.config = config;
    this.buildHandler = buildHandler;
  }

  add(property: keyof P, value: P[keyof P]) {
    const configValue = this.config[property];

    if (!configValue) {
      return;
    }
    if (configValue === true) {
      this.processedProps[property] = value;
    } else if (typeof configValue === 'string') {
      this.processedProps[property] = hasSuffix(value)
        ? value
        : `${value}${configValue}`;
    } else if (isPropertyAlias<P>(configValue)) {
      this.add(configValue.as, value);
    } else {
      const { process, name } = configValue;
      const processedValue = process ? process(value) : String(value);
      if (processedValue) {
        this.processedProps[property] = processedValue;
      }
      if (name) {
        this.nameAliases[property] = name;
      }
    }
  }

  build(): string {
    const result = this.buildHandler(this.processedProps, this.nameAliases);
    this.cleanup();
    return result;
  }

  buildFrom(props: P): string {
    Object.entries(props).forEach(([key, value]) => this.add(key, value));
    return this.build();
  }

  protected cleanup() {
    this.processedProps = {} as Record<keyof P, string>;
    this.nameAliases = {} as Record<keyof P, string>;
  }
}

const defaultStyleBuildHandler: BuildHandler<AnyRecord> = (
  props,
  nameAliases
) =>
  Object.entries(props)
    .map(([key, value]) => `${nameAliases[key] ?? kebabize(key)}: ${value}`)
    .join('; ');

export function createStyleBuilder<P extends AnyRecord>(
  config: StyleBuilderConfig<P>,
  buildHandler: BuildHandler<P> = defaultStyleBuildHandler
): StyleBuilder<P> {
  return new StyleBuilderImpl(config, buildHandler);
}
