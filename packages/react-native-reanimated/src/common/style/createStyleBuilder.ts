'use strict';

import type { AnyRecord } from '../types';
import { isConfigPropertyAlias, isDefined, isRecord } from '../utils';
import type { StyleBuilder, StyleBuilderConfig } from './types';

class StyleBuilderImpl<P extends AnyRecord> implements StyleBuilder<P> {
  private readonly config: StyleBuilderConfig<P>;

  private processedProps = {} as P;

  constructor(config: StyleBuilderConfig<P>) {
    this.config = config;
  }

  add(property: keyof P, value: P[keyof P]): void {
    const configValue = this.config[property];

    if (!configValue || !isDefined(value)) {
      return;
    }

    if (configValue === true) {
      this.maybeAssignProp(property, value);
    } else if (isConfigPropertyAlias<P>(configValue)) {
      this.add(configValue.as, value);
    } else {
      const { process } = configValue;
      const processedValue = process ? process(value) : value;

      if (!isDefined(processedValue)) {
        return;
      }

      if (isRecord<P>(processedValue)) {
        this.maybeAssignProps(processedValue);
      } else {
        this.maybeAssignProp(property, processedValue);
      }
    }
  }

  build(): P | null {
    const result = this.processedProps;
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

  private maybeAssignProp(property: keyof P, value: P[keyof P]) {
    this.processedProps[property] ??= value;
  }

  private maybeAssignProps(props: P) {
    Object.entries(props).forEach(([key, value]) =>
      this.maybeAssignProp(key, value)
    );
  }

  private cleanup() {
    this.processedProps = {} as P;
  }
}

export default function createStyleBuilder<P extends AnyRecord>(
  config: StyleBuilderConfig<P>
): StyleBuilder<Partial<P>> {
  return new StyleBuilderImpl(config);
}
