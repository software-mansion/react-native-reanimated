import type { GraphObserver } from './types';

export class Graph {
  private vertices$: Record<string, Vertex> = {};
  private edges$: Record<string, Edge> = {};
  private readonly observers$: Set<GraphObserver> = new Set();

  addVertex(key: string) {
    if (this.vertices$[key]) {
      throw new Error(`Vertex already exists: ${key}`);
    }
    const vertex = new Vertex(key);
    this.vertices$[key] = vertex;
    this.notifyObservers('vertexAdded', this.vertices$[key]);
  }

  addEdge(key1: string, key2: string) {
    const v1 = this.vertices$[key1];
    const v2 = this.vertices$[key2];
    if (!v1 || !v2) {
      throw new Error(`Vertex not found: ${!v1 ? key1 : key2}`);
    }
    const key = this.createEdgeKey(key1, key2);
    if (this.edges$[key]) {
      throw new Error(`Edge already exists: ${key}`);
    }
    const edge = new Edge([v1, v2]);
    this.edges$[key] = edge;
    this.notifyObservers('edgeAdded', edge);
  }

  removeVertex(key: string) {
    if (!this.vertices$[key]) {
      throw new Error(`Vertex not found: ${key}`);
    }
    delete this.vertices$[key];
    Object.keys(this.edges$).forEach((edgeKey) => {
      if (edgeKey.includes(key)) {
        delete this.edges$[edgeKey];
        this.notifyObservers('edgeRemoved', this.edges$[edgeKey]);
      }
    });
    this.notifyObservers('vertexRemoved', this.vertices$[key]);
  }

  removeEdge(key1: string, key2: string) {
    const key = this.createEdgeKey(key1, key2);
    if (!this.edges$[key]) {
      throw new Error(`Edge not found: ${key}`);
    }
    delete this.edges$[key];
  }

  addObserver(observer: GraphObserver) {
    this.observers$.add(observer);
  }

  removeObserver(observer: GraphObserver) {
    this.observers$.delete(observer);
  }

  get vertices() {
    return Object.values(this.vertices$);
  }

  get edges() {
    return Object.values(this.edges$);
  }

  private createEdgeKey(key1: string, key2: string) {
    return [key1, key2].sort().join('-');
  }

  private notifyObservers<M extends keyof GraphObserver>(
    method: M,
    ...args: Parameters<Required<GraphObserver>[M]>
  ) {
    this.observers$.forEach((observer) => {
      if (observer[method]) {
        (
          observer[method] as (
            ...args: Parameters<Required<GraphObserver>[M]>
          ) => void
        )(...args);
      }
    });
  }
}

export class Vertex {
  private readonly key$: string;

  constructor(key: string) {
    this.key$ = key;
  }

  get key() {
    return this.key$;
  }
}

export class Edge {
  private readonly vertices$: [Vertex, Vertex];

  constructor(vertices: [Vertex, Vertex]) {
    this.vertices$ = vertices;
  }

  get vertices(): [Vertex, Vertex] {
    return this.vertices$;
  }

  get key() {
    return this.vertices$.map((v) => v.key).join('-');
  }
}
