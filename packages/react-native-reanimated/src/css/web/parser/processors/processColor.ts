import type { ColorValue } from 'react-native';
import type { ValueProcessor } from '../types';

const processColor: ValueProcessor<ColorValue> = (value) => {
  if (typeof value !== 'string') {
    return;
  }

  if (value.startsWith('hwb')) {
    return value.replace(/,/g, '');
  }

  return value;
};

export default processColor;
