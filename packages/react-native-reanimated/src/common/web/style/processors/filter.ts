'use strict';
import type { FilterFunction } from 'react-native';

import { maybeAddSuffix, kebabizeCamelCase } from '../../../utils';
import type { ValueProcessor } from '../types';

function parseFilterValue(filterName: string, filterValue: any) {
  switch (filterName) {
    case 'hueRotate':
      return `${maybeAddSuffix(filterValue, 'deg')}`;

    case 'blur':
      return `${maybeAddSuffix(filterValue, 'px')}`;

    case 'dropShadow':
      if (typeof filterValue === 'string') {
        return `${filterValue}`;
      }

      return [
        maybeAddSuffix(filterValue.offsetX, 'px'),
        maybeAddSuffix(filterValue.offsetY, 'px'),
        maybeAddSuffix(filterValue.standardDeviation, 'px'),
        filterValue.color,
      ]
        .filter(Boolean)
        .join(' ');

    default:
      return filterValue;
  }
}

export const processFilterWeb: ValueProcessor<
  ReadonlyArray<FilterFunction> | string
> = (value) => {
  if (typeof value === 'string') {
    return value;
  }

  return value
    .map((filter) =>
      Object.entries(filter)
        .map(([filterProp, filterValue]) => {
          const kebabName = kebabizeCamelCase(filterProp);
          const parsedValue = parseFilterValue(filterProp, filterValue);

          return `${kebabName}(${parsedValue})`;
        })
        .join(' ')
    )
    .join(' ');
};
