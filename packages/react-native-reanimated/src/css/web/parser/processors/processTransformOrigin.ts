import type { ValueProcessor } from '../types';

const processTransformOrigin: ValueProcessor<(string | number)[] | string> = (
  value
) => {
  if (typeof value === 'string') {
    return value;
  }

  return value.map((v) => (typeof v === 'number' ? `${v}px` : v)).join(' ');
};

export default processTransformOrigin;
