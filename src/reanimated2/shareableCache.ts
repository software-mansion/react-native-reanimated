'use strict';
import type { ShareableRef } from './commonTypes';

export const shareableCache = new WeakMap<object, ShareableRef | symbol>();
