'use strict';
import type { TransformsStyle } from 'react-native';

import { createStyleBuilder } from '../builderFactories';
import type { ValueProcessor } from '../types';

const transformBuilder = createStyleBuilder(
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
  (transforms, nameAliases) =>
    Object.entries(transforms)
      .map(([key, value]) => `${nameAliases[key] ?? key}(${value})`)
      .join(' ')
);

export const processTransform: ValueProcessor<
  Required<TransformsStyle['transform']>
> = (value) => {
  if (!value) {
    return;
  }

  if (typeof value === 'string') {
    return value;
  }

  value.forEach((transform) =>
    Object.entries(transform).forEach(([transformProp, transformValue]) =>
      transformBuilder.add(
        transformProp as keyof TransformsStyle['transform'],
        transformValue
      )
    )
  );

  return transformBuilder.build();
};

export const processTransformOrigin: ValueProcessor<
  (string | number)[] | string
> = (value) => {
  if (typeof value === 'string') {
    return value;
  }

  return value.map((v) => (typeof v === 'number' ? `${v}px` : v)).join(' ');
};
