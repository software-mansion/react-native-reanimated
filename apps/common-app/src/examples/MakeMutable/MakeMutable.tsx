import React, { useEffect, useMemo } from 'react';
import { Graph } from './models';
import UndirectedGraph from './UndirectedGraph';

const INITIAL_VERTICES = ['A', 'B', 'C', 'D', 'E'];

const INITIAL_EDGES: [string, string][] = [
  ['A', 'B'],
  ['A', 'C'],
  ['B', 'C'],
  ['B', 'D'],
  ['C', 'D'],
  ['C', 'E'],
  ['D', 'E'],
];

export default function MakeMutableExample() {
  const graph = useMemo(() => new Graph(), []);

  useEffect(() => {
    setTimeout(() => {
      INITIAL_VERTICES.forEach((key) => {
        graph.addVertex(key);
      });

      INITIAL_EDGES.forEach(([from, to]) => {
        graph.addEdge(from, to);
      });
    }, 100);
  }, []);

  return <UndirectedGraph graph={graph} />;
}
