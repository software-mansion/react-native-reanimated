import React, { useEffect, useMemo, useState } from 'react';
import type { SharedValue } from 'react-native-reanimated';
import { useDerivedValue } from 'react-native-reanimated';
import { Line } from '@shopify/react-native-skia';
import type { AnimatedVector, GraphObserver } from './types';
import type { Graph } from './models';

type GraphEdgeProps = {
  x1: SharedValue<number>;
  y1: SharedValue<number>;
  x2: SharedValue<number>;
  y2: SharedValue<number>;
};

export function GraphEdge({ x1, x2, y1, y2 }: GraphEdgeProps) {
  const p1 = useDerivedValue(() => ({ x: x1.value, y: y1.value }));
  const p2 = useDerivedValue(() => ({ x: x2.value, y: y2.value }));

  return <Line p1={p1} p2={p2} color="black" />;
}

type GraphEdgesProps = {
  graph: Graph;
  vertexPositions: Record<string, AnimatedVector>;
};

export function GraphEdges({ graph, vertexPositions }: GraphEdgesProps) {
  const [edges, setEdges] = useState<
    Record<string, { key1: string; key2: string }>
  >({});

  const observer = useMemo<GraphObserver>(
    () => ({
      edgeAdded(edge) {
        setEdges((prev) => ({
          ...prev,
          [edge.key]: {
            key1: edge.vertices[0].key,
            key2: edge.vertices[1].key,
          },
        }));
      },
      edgeRemoved(edge) {
        setEdges((prev) => {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { [edge.key]: _, ...rest } = prev;
          return rest;
        });
      },
    }),
    []
  );

  useEffect(() => {
    graph.addObserver(observer);

    return () => {
      graph.removeObserver(observer);
    };
  }, [graph, observer]);

  return Object.values(edges).map(({ key1, key2 }, index) => {
    if (!vertexPositions[key1] || !vertexPositions[key2]) {
      return null;
    }
    const { x: x1, y: y1 } = vertexPositions[key1];
    const { x: x2, y: y2 } = vertexPositions[key2];
    return <GraphEdge key={index} x1={x1} y1={y1} x2={x2} y2={y2} />;
  });
}
