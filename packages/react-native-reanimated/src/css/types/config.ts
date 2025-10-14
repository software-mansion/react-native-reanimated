'use strict';
import type { AnyRecord } from '../../common';

export type ConfigPropertyAlias<P extends AnyRecord> = {
  as: keyof P;
};
