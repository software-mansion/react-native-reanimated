import type { SharedValue } from 'react-native-reanimated';
import type { Edge, Vertex } from './models';

export type GraphObserver = {
  vertexAdded?(vertex: Vertex): void;
  edgeAdded?(edge: Edge): void;
  vertexRemoved?(vertex: Vertex): void;
  edgeRemoved?(edge: Edge): void;
};

export type AnimatedVector = {
  x: SharedValue<number>;
  y: SharedValue<number>;
};
