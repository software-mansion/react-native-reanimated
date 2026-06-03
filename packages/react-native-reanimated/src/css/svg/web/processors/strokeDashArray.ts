'use strict';
import { maybeAddSuffix } from '../../../../common';

export const processStrokeDashArray = (
  value: number | string | ReadonlyArray<number | string>
): string =>
  Array.isArray(value)
    ? value.map((element) => maybeAddSuffix(element, 'px')).join(' ')
    : maybeAddSuffix(value, 'px');
