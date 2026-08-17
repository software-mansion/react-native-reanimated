'use strict';

export const IS_JEST: boolean =
  typeof globalThis.jest !== 'undefined' || process.env.NODE_ENV === 'test';
