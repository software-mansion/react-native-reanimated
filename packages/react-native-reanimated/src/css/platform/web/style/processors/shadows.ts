'use strict';
import type { BoxShadowValue, ViewStyle } from 'react-native';

import { parseBoxShadowString } from '../../../../utils';
import { maybeAddSuffix } from '../../utils';
import type { ValueProcessor } from '../types';

export const processBoxShadow: ValueProcessor<
  string | ReadonlyArray<BoxShadowValue>
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

type ShadowOffset = NonNullable<ViewStyle['shadowOffset']>;

export const processShadowOffset: ValueProcessor<ShadowOffset> = (value) =>
  `${value.width}px ${value.height}px`;
