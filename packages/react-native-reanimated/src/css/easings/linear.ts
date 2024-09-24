import { ReanimatedError } from '../../errors';
import type {
  LinearEasingInputPoint,
  LinearEasingNormalizedPoint,
  LinearEasingProcessedPoint,
  LinearEasingConfig,
} from './types';

export function linear(points: LinearEasingInputPoint[]): LinearEasingConfig {
  if (points.length < 2) {
    throw new ReanimatedError(
      `Invalid linear easing points. There should be at least two points with 0% and 100% x percentages`
    );
  }

  // Normalize x values
  const normalizedPoints: LinearEasingNormalizedPoint[] = points.map(
    (point) => {
      if (typeof point === 'object') {
        // Parse percentage to float
        const newValue = parseFloat(point.x) / 100;
        if (Number.isNaN(newValue)) {
          throw new ReanimatedError(
            `Invalid linear easing point x value: ${point.x}, it should be a string between '0%' and '100%'`
          );
        }
        if (newValue < 0 || newValue > 1) {
          throw new ReanimatedError(
            `Invalid linear easing point x percentage ${point.x}, it should be between 0% and 100%`
          );
        }
        return { y: point.y, x: newValue };
      } else {
        return point;
      }
    }
  );

  // Make sure the first point has a 0 x value
  const firstPoint = normalizedPoints[0];
  if (typeof firstPoint === 'object') {
    if (firstPoint.x > 0) {
      throw new ReanimatedError(
        `Linear easing starting point should have 0% percentage or no percentage.`
      );
    }
  } else if (typeof firstPoint === 'number') {
    normalizedPoints[0] = { y: firstPoint, x: 0 };
  }

  // Make sure the last point has a 1 x value
  const lastPoint = normalizedPoints[normalizedPoints.length - 1];
  if (typeof lastPoint === 'object') {
    if (lastPoint.x < 1) {
      throw new ReanimatedError(
        `Linear easing ending point should have 100% percentage or no percentage.`
      );
    }
  } else if (typeof lastPoint === 'number') {
    normalizedPoints[normalizedPoints.length - 1] = { y: lastPoint, x: 1 };
  }

  // Check if points defined x values create an increasing sequence
  let lastKnownX = 0;
  for (let i = 1; i < normalizedPoints.length; i++) {
    const point = normalizedPoints[i];
    if (typeof point === 'object') {
      if (point.x <= lastKnownX) {
        throw new ReanimatedError(
          `Linear easing points x percentages should be an increasing sequence`
        );
      }
      lastKnownX = point.x;
    }
  }

  // Infer x values for only y value points
  let leftKnownIdx = 0;
  let rightKnownIdx = -1;
  while (leftKnownIdx < normalizedPoints.length - 1) {
    // Search for the closest (to the leftKnownIdx) point that has an x value
    rightKnownIdx = leftKnownIdx + 1;
    while (typeof normalizedPoints[rightKnownIdx] === 'number') {
      rightKnownIdx++;
    }

    // Get x values of left and right known points
    let leftValue = 0;
    const leftPoint = normalizedPoints[leftKnownIdx];
    if (typeof leftPoint === 'object') {
      leftValue = leftPoint.x;
    }
    let rightValue = 0;
    const rightPoint = normalizedPoints[rightKnownIdx];
    if (typeof rightPoint === 'object') {
      rightValue = rightPoint.x;
    }

    // Calculate the increase of x for the points in the middle
    const xIncrease =
      (1 / (rightKnownIdx - leftKnownIdx)) * (rightValue - leftValue);
    // Set x values for interpolated points
    for (let i = leftKnownIdx + 1; i < rightKnownIdx; i++) {
      const currentPoint = normalizedPoints[i];
      const previousPoint = normalizedPoints[i - 1];
      if (
        typeof currentPoint === 'number' &&
        typeof previousPoint === 'object'
      ) {
        normalizedPoints[i] = {
          y: currentPoint,
          x: previousPoint.x + xIncrease,
        };
      }
    }

    leftKnownIdx = rightKnownIdx;
  }

  // Force cast because know we are sure all the points are processed to objects
  const processedPoints =
    normalizedPoints as unknown as LinearEasingProcessedPoint[];

  return {
    name: 'linearParametrized',
    pointsX: processedPoints.map((point) => point.x),
    pointsY: processedPoints.map((point) => point.y),
  };
}
