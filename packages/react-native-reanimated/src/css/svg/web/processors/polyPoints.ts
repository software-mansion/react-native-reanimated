'use strict';

// RNSVG renders Polygon/Polyline as a <path> on web, so their geometry animates
// via `d`: the configs alias `points` to `d` and build the CSS path() with this.
export const pointsToPathD =
  (closed: boolean) =>
  (points: unknown): string =>
    `path("M${String(points)}${closed ? 'Z' : ''}")`;
