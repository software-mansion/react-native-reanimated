'use strict';

/**
 * Picks the timestamp an animation should baseline on.
 *
 * An explicit override (the frame flush passing its own timestamp) wins.
 * Otherwise the timestamp of the frame currently being produced is used, so
 * work started during that frame — a gesture, an event, the draw pass — shares
 * the baseline the frame will progress animations with.
 *
 * `undefined` means no frame is in progress. Callers then read the clock. A
 * previous frame's timestamp must not be reused: the next frame is in the
 * future, and baselining on the one that already happened would make a fresh
 * animation look partly elapsed.
 */
export function selectFrameTimestamp(
  override: number | undefined,
  currentFrameTimestamp: number | undefined
): number | undefined {
  'worklet';
  return override !== undefined ? override : currentFrameTimestamp;
}
