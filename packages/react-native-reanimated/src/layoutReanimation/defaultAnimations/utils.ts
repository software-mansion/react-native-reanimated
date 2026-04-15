'use strict';

import type { UnknownRecord } from '../../common';
import type { TransformArray, TransformsConfig } from './types';

/**
 * Resolves a whole transform tuple for layout animation initial values. For
 * each slot, tries the flat prop first, then the deprecated
 * `transform[index][key]`, then the provided default.
 */
export function pickTransformValues<const TTransforms extends TransformArray>(
  defaults: TTransforms,
  values: Partial<TransformsConfig<TTransforms>> | undefined
): TTransforms {
  'worklet';
  return defaults.map((entry, index) => {
    const [key, defaultValue] = Object.entries(entry)[0];
    return {
      [key]:
        values?.[key as keyof typeof values] ??
        (values?.transform?.[index] as UnknownRecord | undefined)?.[key] ??
        defaultValue,
    };
  }) as unknown as TTransforms;
}
