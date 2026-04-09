'use strict';

import type { UnknownRecord } from '../../common';
import type {
  AnimationFunction,
  LayoutAnimationAndConfig,
} from '../../commonTypes';
import type { TransformArray, TransformsConfig } from './types';

function resolveTransformSlot<const TTransforms extends TransformArray>(
  entry: TTransforms[number],
  index: number,
  values: Partial<TransformsConfig<TTransforms>> | undefined
): [string, unknown] {
  'worklet';
  const [key, defaultValue] = Object.entries(entry)[0];
  const value =
    values?.[key as keyof typeof values] ??
    (values?.transform?.[index] as UnknownRecord | undefined)?.[key] ??
    defaultValue;
  return [key, value];
}

export function pickTransformValues<const TTransforms extends TransformArray>(
  defaults: TTransforms,
  values: Partial<TransformsConfig<TTransforms>> | undefined
): TTransforms {
  'worklet';
  return defaults.map((entry, index) => {
    const [key, value] = resolveTransformSlot(entry, index, values);
    return { [key]: value };
  }) as unknown as TTransforms;
}

export function animateTransformToValues<
  const TTransforms extends TransformArray,
>(
  defaults: TTransforms,
  values: Partial<TransformsConfig<TTransforms>> | undefined,
  [animation, config]: LayoutAnimationAndConfig,
  delayFunction: AnimationFunction,
  delay: number
): TTransforms {
  'worklet';
  return defaults.map((entry, index) => {
    const [key, value] = resolveTransformSlot(entry, index, values);
    return {
      [key]: delayFunction(delay, animation(value, config)),
    };
  }) as unknown as TTransforms;
}
