'use strict';

import { hasSuffix } from '../../../../common';
import type { AnyRecord } from '../../../types';
import {
  hasProp,
  isConfigPropertyAlias,
  isDefined,
  isRecord,
  kebabizeCamelCase,
} from '../../../utils';
import type {
  AnyBuilderConfig,
  RuleBuilder,
  RuleBuilderConfig,
  RuleBuildHandler,
  StyleBuilder,
  StyleBuilderConfig,
  StyleBuildHandler,
  ValueProcessor,
} from './types';

const hasValueProcessor = (
  configValue: unknown
): configValue is { process: ValueProcessor<unknown> } =>
  typeof configValue === 'object' &&
  configValue !== null &&
  'process' in configValue;

abstract class BuilderBase<P extends AnyRecord, R> {
  protected readonly config: AnyBuilderConfig<P>;

  protected processedProps = {} as Record<keyof P, string>;

  constructor(config: AnyBuilderConfig<P>) {
    this.config = config;
  }

  add(property: keyof P, value: P[keyof P]) {
    const configValue = this.config[property];

    if (!configValue || !isDefined(value) || configValue === false) {
      return;
    }

    if (configValue === true) {
      this.maybeAssignProp(property, String(value));
    } else if (typeof configValue === 'string') {
      this.maybeAssignProp(
        property,
        hasSuffix(value) ? value : `${String(value)}${configValue}`
      );
    } else if (isConfigPropertyAlias<P>(configValue)) {
      this.add(configValue.as, value);
    } else {
      this.customProcess(property, value);
    }
  }

  abstract build(): R;

  protected abstract customProcess(
    _property: keyof P,
    _value: P[keyof P]
  ): void;

  protected maybeAssignProp(property: keyof P, value: string) {
    this.processedProps[property] ??= value;
  }

  protected maybeAssignProps(properties: Record<string, string>) {
    Object.entries(properties).forEach(([key, value]) =>
      this.maybeAssignProp(key, value)
    );
  }

  protected handleProcess(
    property: keyof P,
    value: P[keyof P],
    process: ValueProcessor<P[keyof P]>
  ) {
    const processedValue = process ? process(value) : String(value);

    if (!isDefined(processedValue)) {
      return;
    }

    if (isRecord(processedValue)) {
      this.maybeAssignProps(processedValue);
    } else {
      this.maybeAssignProp(property, processedValue);
    }
  }
}

class StyleBuilderImpl<P extends AnyRecord>
  extends BuilderBase<P, string | null>
  implements StyleBuilder<P>
{
  private readonly buildHandler: StyleBuildHandler<P>;

  private ruleBuildersSet: Set<RuleBuilder<P>> = new Set();
  private nameAliases = {} as Record<keyof P, string>;

  constructor(
    config: StyleBuilderConfig<P>,
    buildHandler: StyleBuildHandler<P>
  ) {
    super(config);
    this.buildHandler = buildHandler;
  }

  buildFrom(props: P): string | null {
    Object.entries(props).forEach(([key, value]) => this.add(key, value));
    return this.build();
  }

  override build(): string | null {
    this.buildRuleBuilders();
    const result = this.buildHandler(this.processedProps, this.nameAliases);
    this.cleanup();
    return result;
  }

  protected override customProcess(property: keyof P, value: P[keyof P]) {
    const configValue = this.config[property];

    if (typeof configValue !== 'object') {
      return;
    }

    if (isRuleBuilder<P>(configValue)) {
      this.ruleBuildersSet.add(configValue);
      configValue.add(property, value);
    } else {
      if (hasValueProcessor(configValue)) {
        this.handleProcess(property, value, configValue.process);
      } else {
        this.maybeAssignProp(property, String(value));
      }

      if (hasProp(configValue, 'name')) {
        this.nameAliases[property] = configValue.name;
      }
    }
  }

  private buildRuleBuilders() {
    // Build props which are created from other style properties
    this.ruleBuildersSet.forEach((builder) =>
      this.maybeAssignProps(builder.build())
    );
    this.ruleBuildersSet.clear();
  }

  private cleanup() {
    this.processedProps = {} as Record<keyof P, string>;
    this.nameAliases = {} as Record<keyof P, string>;
  }
}

class RuleBuilderImpl<P extends AnyRecord>
  extends BuilderBase<P, Record<string, string>>
  implements RuleBuilder<P>
{
  private readonly buildHandler: RuleBuildHandler<P>;

  constructor(config: RuleBuilderConfig<P>, buildHandler: RuleBuildHandler<P>) {
    super(config);
    this.buildHandler = buildHandler;
  }

  override build(): Record<string, string> {
    const result = this.buildHandler(this.processedProps);
    this.cleanup();
    return result;
  }

  protected override customProcess(property: keyof P, value: P[keyof P]) {
    const configValue = this.config[property];
    if (hasValueProcessor(configValue)) {
      this.handleProcess(property, value, configValue.process);
    }
  }

  private cleanup() {
    this.processedProps = {} as Record<keyof P, string>;
  }
}

const isRuleBuilder = <P extends AnyRecord>(
  value: unknown
): value is RuleBuilder<P> => value instanceof RuleBuilderImpl;

const defaultStyleBuildHandler: StyleBuildHandler<AnyRecord> = (
  props,
  nameAliases
) => {
  const entries = Object.entries(props);

  if (entries.length === 0) {
    return null;
  }

  return entries
    .map(
      ([key, value]) =>
        `${nameAliases[key] ?? kebabizeCamelCase(key)}: ${value}`
    )
    .join('; ');
};

export function createStyleBuilder<P extends AnyRecord>(
  config: StyleBuilderConfig<P>,
  buildHandler: StyleBuildHandler<P> = defaultStyleBuildHandler
): StyleBuilder<Partial<P>> {
  return new StyleBuilderImpl(config, buildHandler);
}

export function createRuleBuilder<P extends AnyRecord>(
  config: RuleBuilderConfig<P>,
  buildHandler: RuleBuildHandler<P>
): RuleBuilder<Partial<P>> {
  return new RuleBuilderImpl(config, buildHandler);
}
