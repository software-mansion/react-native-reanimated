'use strict';
import type { CSSAnimationIterationCount } from '../../types';

export function normalizeIterationCount(
  iterationCount: CSSAnimationIterationCount
): string {
  if (iterationCount === Infinity || iterationCount === 'infinite') {
    return 'infinite';
  }
  return String(iterationCount);
}
