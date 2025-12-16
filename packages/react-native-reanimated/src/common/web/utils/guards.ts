'use strict';
import { isRecord } from '../../utils';

export function hasNameAlias(
  configValue: unknown
): configValue is { name: string; [key: string]: unknown } {
  return (
    isRecord(configValue) &&
    'name' in configValue &&
    typeof configValue.name === 'string'
  );
}
