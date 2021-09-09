import { RefObject } from 'react';
import { measure } from '.';

export interface ComponentCoords {
  x: number;
  y: number;
}

export function convertCoords<T>(
  parentRef: RefObject<T>,
  x: number,
  y: number
): ComponentCoords {
  'worklet';
  const parentCoords = measure(parentRef);
  return {
    x: x - parentCoords.x,
    y: y - parentCoords.y,
  };
}
