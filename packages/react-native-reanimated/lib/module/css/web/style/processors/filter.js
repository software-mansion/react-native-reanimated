'use strict';

import { maybeAddSuffix } from '../../../../common';
const FILTER_SUFFIXES = {
  brightness: '%',
  blur: 'px',
  contrast: '%',
  grayscale: '%',
  hueRotate: 'deg',
  invert: '%',
  saturate: '%',
  sepia: '%'
};
export const processFilter = value => {
  if (typeof value === 'string') {
    return value;
  }
  return value.map(filter => Object.entries(filter).map(([filterProp, filterValue]) => {
    if (filterProp !== 'dropShadow') {
      return `${filterProp}(${maybeAddSuffix(filterValue, FILTER_SUFFIXES[filterProp])})`;
    } else if (typeof filterValue === 'string') {
      return `drop-shadow(${filterValue})`;
    } else {
      return `drop-shadow(${[maybeAddSuffix(filterValue.offsetX, 'px'), maybeAddSuffix(filterValue.offsetY, 'px'), maybeAddSuffix(filterValue.standardDeviation, 'px'), filterValue.color].filter(Boolean).join(' ')})`;
    }
  }).join(' ')).join(', ');
};
//# sourceMappingURL=filter.js.map