import { processColor } from 'react-native';
import type { BoxShadowValue } from 'react-native';
import type { ValueProcessor } from '../types';
import { maybeAddSuffix } from '../../utils';

const processBoxShadow: ValueProcessor<
  string | ReadonlyArray<BoxShadowValue>
> = (value) => {
  if (typeof value === 'string') {
    return value;
  }

  return value
    .map(
      ({
        offsetX,
        offsetY,
        color = '',
        blurRadius = '',
        spreadDistance = '',
        inset = '',
      }) =>
        [
          maybeAddSuffix(offsetX, 'px'),
          maybeAddSuffix(offsetY, 'px'),
          maybeAddSuffix(blurRadius, 'px'),
          maybeAddSuffix(spreadDistance, 'px'),
          processColor(color),
          inset === undefined ? '' : inset ? 'inset' : 'outset',
        ].join(' ')
    )
    .join(', ');
};

export default processBoxShadow;
