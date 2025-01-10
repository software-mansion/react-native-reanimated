import type { AnyRecord } from '../../../types';
import { isConfigPropertyAlias, isDefined, isRecord } from '../../../utils';
import type { BuildHandler, StyleBuilder, StyleBuilderConfig } from './types';

class StyleBuilderImpl<P extends AnyRecord> implements StyleBuilder<P> {
  private readonly buildHandler: BuildHandler<P>;

  private readonly config: StyleBuilderConfig<P>;

  private processedProps = {} as P;

  constructor(config: StyleBuilderConfig<P>, buildHandler: BuildHandler<P>) {
    this.config = config;
    this.buildHandler = buildHandler;
  }

  add(property: keyof P, value: P[keyof P]): void {
    const configValue = this.config[property];

    if (!configValue || !isDefined(value)) {
      return;
    }

    if (configValue === true) {
      this.processedProps[property] = value;
    } else if (isConfigPropertyAlias<P>(configValue)) {
      this.add(configValue.as, value);
    } else {
      const { process } = configValue;
      const processedValue = process ? process(value) : value;

      if (isDefined(processedValue)) {
        if (isRecord(processedValue)) {
          Object.assign(this.processedProps, processedValue);
        } else {
          this.processedProps[property] = processedValue;
        }
      }
    }
  }

  build(): P | null {
    const result = this.buildHandler(this.processedProps);
    this.cleanup();

    if (Object.keys(result).length === 0) {
      return null;
    }

    return result;
  }

  buildFrom(props: P): P | null {
    Object.entries(props).forEach(([key, value]) => this.add(key, value));
    return this.build();
  }

  private cleanup() {
    this.processedProps = {} as P;
  }
}

export default function createStyleBuilder<P extends AnyRecord>(
  config: StyleBuilderConfig<P>,
  buildHandler: BuildHandler<P> = (props) => props
): StyleBuilder<Partial<P>> {
  return new StyleBuilderImpl(config, buildHandler);
}
