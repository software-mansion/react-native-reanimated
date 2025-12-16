'use strict';
import type { TransformsStyle } from 'react-native';

import { createWebRuleBuilder } from '../ruleBuilder';
import type { ValueProcessor } from '../types';

const transformBuilder = createWebRuleBuilder(
  {
    perspective: 'px',
    rotate: true,
    rotateX: true,
    rotateY: true,
    rotateZ: true,
    scale: true,
    scaleX: true,
    scaleY: true,
    translateX: 'px',
    translateY: 'px',
    skewX: true,
    skewY: true,
    matrix: { name: 'matrix3d' },
  },
  (transforms) => {
    const transformString = Object.entries(transforms)
      .map(([key, value]) => `${key}(${value})`)
      .join(' ');
    return { transform: transformString };
  }
);

export const processTransform: ValueProcessor<
  NonNullable<TransformsStyle['transform']>
> = (value) => {
  if (!value) {
    return;
  }

  if (typeof value === 'string') {
    return value;
  }

  value.forEach((transform) =>
    Object.entries(transform ?? {}).forEach(([transformProp, transformValue]) =>
      transformBuilder.add(
        transformProp as keyof TransformsStyle['transform'],
        transformValue
      )
    )
  );

  const result = transformBuilder.build();
  return result.transform;
};

export const processTransformOrigin: ValueProcessor<
  (string | number)[] | string
> = (value) => {
  if (typeof value === 'string') {
    return value;
  }

  return value.map((v) => (typeof v === 'number' ? `${v}px` : v)).join(' ');
};
