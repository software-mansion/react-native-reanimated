'use strict';
import type { FilterFunction } from 'react-native';

import { maybeAddSuffix } from '../../../utils';
import type { ValueProcessor } from '../types';

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
          switch (filterProp) {
            case 'hueRotate':
              return `hue-rotate(${maybeAddSuffix(filterValue, 'deg')})`;
            case 'blur':
              return `blur(${maybeAddSuffix(filterValue, 'px')})`;
            case 'dropShadow':
              if (typeof filterValue === 'string') {
                return `drop-shadow(${filterValue})`;
              } else if (typeof filterValue === 'object') {
                return `drop-shadow(${[
                  maybeAddSuffix(filterValue.offsetX, 'px'),
                  maybeAddSuffix(filterValue.offsetY, 'px'),
                  maybeAddSuffix(filterValue.standardDeviation, 'px'),
                  filterValue.color,
                ]
                  .filter(Boolean)
                  .join(' ')})`;
              }
            default:
              return `${filterProp}(${filterValue})`;
          }
        })
        .join(' ')
    )
    .join(' ');
};
