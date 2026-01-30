'use strict';
import type { UnknownRecord } from '../..';
import { isRecord } from '../../utils';
import type { RuleBuilder } from '../style/types';

export function hasNameAlias(
  configValue: unknown
): configValue is { name: string; [key: string]: unknown } {
  return (
    isRecord(configValue) &&
    'name' in configValue &&
    typeof configValue.name === 'string'
  );
}

export function isRuleBuilder<P extends UnknownRecord>(
  value: unknown
): value is RuleBuilder<P> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'add' in value &&
    'build' in value
  );
}
