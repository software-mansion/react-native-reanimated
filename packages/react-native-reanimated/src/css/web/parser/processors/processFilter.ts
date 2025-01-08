import type { FilterFunction } from 'react-native';
import type { ValueProcessor } from '../types';

const processFilter: ValueProcessor<ReadonlyArray<FilterFunction> | string> = (
  value
) => {
  if (typeof value === 'string') {
    return value;
  }

  return value
    .map((filter) =>
      Object.entries(filter)
        .map(([filterProp, filterValue]) => `${filterProp}(${filterValue})`)
        .join(' ')
    )
    .join(', ');
};

export default processFilter;
