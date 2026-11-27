/*
 * The cases of the native layout suites that have a statement on the wall clock. The suite of a case plays
 * it for statements A and B of `native layout reference`, and the suite `native layout live clock` plays it
 * for the wall-clock statements.
 */

import type { Place } from './nativeLayoutReferencePlay';

export const SIZE_DURATION = 2000;
export const SIZE_START: Place = { left: 0, top: 0, width: 50, height: 50 };
export const MOVED_AND_RESIZED: Place = {
  left: 120,
  top: 40,
  width: 150,
  height: 90,
};
