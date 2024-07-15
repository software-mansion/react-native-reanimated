import React from 'react';
import { Circle } from '@shopify/react-native-skia';
import type { AnimatedVector } from './types';

export function GraphVertex({ x, y }: AnimatedVector) {
  return <Circle cx={x} cy={y} r={10} color="blue" />;
}

type GraphVerticesProps = {
  positions: AnimatedVector[];
};

export function GraphVertices({ positions }: GraphVerticesProps) {
  console.log(positions.length);
  return positions.map((position, index) => (
    <GraphVertex key={index} {...position} />
  ));
}
