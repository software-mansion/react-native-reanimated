'use strict';

import { createStyleBuilder } from '../builderFactories';
const transformBuilder = createStyleBuilder({
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
  matrix: {
    name: 'matrix3d'
  }
}, (transforms, nameAliases) => Object.entries(transforms).map(([key, value]) => `${nameAliases[key] ?? key}(${value})`).join(' '));
export const processTransform = value => {
  if (!value) {
    return;
  }
  if (typeof value === 'string') {
    return value;
  }
  value.forEach(transform => Object.entries(transform).forEach(([transformProp, transformValue]) => transformBuilder.add(transformProp, transformValue)));
  return transformBuilder.build();
};
export const processTransformOrigin = value => {
  if (typeof value === 'string') {
    return value;
  }
  return value.map(v => typeof v === 'number' ? `${v}px` : v).join(' ');
};
//# sourceMappingURL=transforms.js.map