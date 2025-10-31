'use strict';
import type { DropShadowValue, FilterFunction } from 'react-native';

import { kebabizeCamelCase, maybeAddSuffix } from '../../../utils';
import type { ValueProcessor } from '../types';

const isDropShadowValue = (value: unknown): value is DropShadowValue => {
  return (
    typeof value === 'object' &&
    value !== null &&
    'offsetX' in value &&
    'offsetY' in value
  );
};

function parseFilterValue(
  filterName: string,
  filterValue: number | string | DropShadowValue
): string {
  switch (filterName) {
    case 'hueRotate':
      return String(maybeAddSuffix(filterValue as number | string, 'deg'));

    case 'blur':
      return String(maybeAddSuffix(filterValue as number | string, 'px'));

    case 'dropShadow':
      if (isDropShadowValue(filterValue)) {
        return [
          maybeAddSuffix(filterValue.offsetX, 'px'),
          maybeAddSuffix(filterValue.offsetY, 'px'),
          maybeAddSuffix(filterValue.standardDeviation, 'px'),
          filterValue.color,
        ]
          .filter(Boolean)
          .map((v) => String(v))
          .join(' ');
      }

      return String(filterValue);

    default:
      return String(filterValue);
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
