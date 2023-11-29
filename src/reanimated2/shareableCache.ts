'use strict';
import type { ShareableRef } from './commonTypes';

export const _shareableCache = new WeakMap<
  Record<string, unknown>,
  ShareableRef<unknown> | symbol
>();
