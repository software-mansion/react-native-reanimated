'use strict';

import type { ValueProcessor } from '../../types';

export const processStripUnit: ValueProcessor<number | string, number> = (
  value
) => (typeof value === 'number' ? value : parseFloat(value));
