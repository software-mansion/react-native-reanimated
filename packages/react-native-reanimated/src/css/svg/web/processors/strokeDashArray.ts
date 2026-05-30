'use strict';
import { maybeAddSuffix } from '../../../../common';

// Suffix each element; suffixing the joined array yields invalid CSS like
// `10%,5%px` that the browser drops.
export const processStrokeDashArray = (
  value: number | string | ReadonlyArray<number | string>
): string =>
  Array.isArray(value)
    ? value.map((element) => maybeAddSuffix(element, 'px')).join(' ')
    : maybeAddSuffix(value, 'px');
