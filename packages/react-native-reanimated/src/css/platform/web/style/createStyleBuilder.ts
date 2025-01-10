import { hasSuffix, kebabize } from '../utils';
import type { BuildHandler, StyleBuilder, StyleBuilderConfig } from './types';
import { isConfigPropertyAlias, isDefined, isRecord } from '../../../utils';
import type { AnyRecord } from '../../../types';

class StyleBuilderImpl<P extends AnyRecord> implements StyleBuilder<P> {
  private readonly buildHandler: BuildHandler<P>;

  protected readonly config: StyleBuilderConfig<P>;

  protected processedProps = {} as Record<keyof P, string>;
  protected nameAliases = {} as Record<keyof P, string>;

  constructor(config: StyleBuilderConfig<P>, buildHandler: BuildHandler<P>) {
    this.config = config;
    this.buildHandler = buildHandler;
  }

  add(property: keyof P, value: P[keyof P]) {
    const configValue = this.config[property];

    if (!configValue || !isDefined(value)) {
      return;
    }

    if (configValue === true) {
      this.processedProps[property] = String(value);
    } else if (typeof configValue === 'string') {
      this.processedProps[property] = hasSuffix(value)
        ? value
        : `${String(value)}${configValue}`;
    } else if (isConfigPropertyAlias<P>(configValue)) {
      this.add(configValue.as, value);
    } else {
      const { process, name } = configValue;
      const processedValue = process ? process(value) : String(value);

      if (isDefined(processedValue)) {
        if (isRecord(processedValue)) {
          Object.assign(this.processedProps, processedValue);
        } else {
          this.processedProps[property] = processedValue;
        }
      }

      if (name) {
        this.nameAliases[property] = name;
      }
    }
  }

  build(): string | null {
    const result = this.buildHandler(this.processedProps, this.nameAliases);
    this.cleanup();

    if (result.length === 0) {
      return null;
    }

    return result;
  }

  buildFrom(props: P): string | null {
    Object.entries(props).forEach(([key, value]) =>
      this.add(key as keyof P, value)
    );
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

export default function createStyleBuilder<P extends AnyRecord>(
  config: StyleBuilderConfig<P>,
  buildHandler: BuildHandler<P> = defaultStyleBuildHandler
): StyleBuilder<Partial<P>> {
  return new StyleBuilderImpl(config, buildHandler);
}
