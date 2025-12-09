'use strict';
import type { BoxShadowValue } from 'react-native';

import type { ValueProcessor } from '../../../types';
import { maybeAddSuffix, parseBoxShadowString } from '../../../utils';

export const processBoxShadowWeb: ValueProcessor<
  string | ReadonlyArray<BoxShadowValue>,
  string
> = (value) => {
  const parsedShadow =
    typeof value === 'string' ? parseBoxShadowString(value) : value;

  return parsedShadow
    .map(
      ({
        offsetX,
        offsetY,
        color = '#000',
        blurRadius = '',
        spreadDistance = '',
        inset = '',
      }) =>
        [
          maybeAddSuffix(offsetX, 'px'),
          maybeAddSuffix(offsetY, 'px'),
          maybeAddSuffix(blurRadius, 'px'),
          maybeAddSuffix(spreadDistance, 'px'),
          color,
          inset ? 'inset' : '',
        ]
          .filter(Boolean)
          .join(' ')
    )
    .join(', ');
};
