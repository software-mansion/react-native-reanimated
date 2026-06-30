'use strict';

import type { LayoutAnimationStartFunction } from '../commonTypes';

export type LayoutAnimationsManager = {
  start: LayoutAnimationStartFunction;
  stop: (tag: number) => void;
};
