'use strict';
import type { AnyRecord, ConvertValuesToArrays } from '../types';

export function convertConfigPropertiesToArrays<T extends AnyRecord>(
  config: T
) {
  return Object.fromEntries(
    Object.entries(config).map(([key, value]) => {
      return [key, Array.isArray(value) ? value : [value]];
    })
  ) as ConvertValuesToArrays<T>;
}
