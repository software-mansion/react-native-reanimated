import React, { useEffect, useMemo, useState } from 'react';
import type { Graph } from './models';
import type { AnimatedVector, GraphObserver } from './types';
import { GraphVertices } from './GraphVertices';
import { cancelAnimation, makeMutable } from 'react-native-reanimated';
import { GraphEdges } from './GraphEdges';
import { Canvas } from '@shopify/react-native-skia';
import { StyleSheet } from 'react-native';

type UndirectedGraphProps = {
  graph: Graph;
};

export default function UndirectedGraph({ graph }: UndirectedGraphProps) {
  const [vertexPositions, setVertexPositions] = useState<
    Record<string, AnimatedVector>
  >({});

  const observer = useMemo<GraphObserver>(
    () => ({
      vertexAdded(vertex) {
        setVertexPositions((prev) => ({
          ...prev,
          [vertex.key]: {
            x: makeMutable(0),
            y: makeMutable(0),
          },
        }));
      },
      vertexRemoved(vertex) {
        setVertexPositions((prev) => {
          const { [vertex.key]: removed, ...rest } = prev;
          cancelAnimation(removed.x);
          cancelAnimation(removed.y);
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

  return (
    <Canvas style={styles.fill}>
      <GraphEdges graph={graph} vertexPositions={vertexPositions} />
      <GraphVertices positions={Object.values(vertexPositions)} />
    </Canvas>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
});
