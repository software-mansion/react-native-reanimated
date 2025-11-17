'use strict';

import type { UNSUPPORTED_TRANSFORM_PROPS } from '../constants';

export type UnsupportedTransformProp =
  (typeof UNSUPPORTED_TRANSFORM_PROPS)[number];
