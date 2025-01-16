'use strict';
import type { AnyRecord } from './helpers';

export type ConfigPropertyAlias<P extends AnyRecord> = {
  as: keyof P;
};
