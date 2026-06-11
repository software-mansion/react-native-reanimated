'use strict';
import { pointsToPathD } from '../polyPoints';

describe(pointsToPathD, () => {
  test('closed builds a Polygon path (closed with Z)', () => {
    expect(pointsToPathD(true)('0,0 10,10 20,0')).toBe(
      'path("M0,0 10,10 20,0Z")'
    );
  });

  test('open builds a Polyline path (no Z)', () => {
    expect(pointsToPathD(false)('0,0 10,10')).toBe('path("M0,0 10,10")');
  });
});
