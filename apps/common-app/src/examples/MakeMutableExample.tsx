import React, { memo, useCallback, useRef, useState } from 'react';
import type { Vector } from '@shopify/react-native-skia';
import { Canvas, Circle, Line } from '@shopify/react-native-skia';
import { Button, Dimensions, StyleSheet, View } from 'react-native';
import {
  makeMutable,
  useDerivedValue,
  withTiming,
} from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';

enum VertexColor {
  RED = 'red',
  GREEN = 'green',
  BLUE = 'blue',
}

function randomPosition(limits?: Partial<Vector>) {
  return {
    x: Math.random() * (limits?.x ?? Dimensions.get('window').width),
    y: Math.random() * (limits?.y ?? Dimensions.get('window').height),
  };
}

function createVertex(color: VertexColor, positionLimits?: Partial<Vector>) {
  const { x, y } = randomPosition(positionLimits);
  return {
    x: makeMutable(x),
    y: makeMutable(y),
    color,
  };
}

function randomChoice<T>(choices: T[]): T {
  return choices[Math.floor(Math.random() * choices.length)];
}

function randomEnumValue<T extends ArrayLike<any>>(en: T): T[keyof T] {
  return randomChoice(Object.values(en));
}

type VertexType = {
  x: SharedValue<number>;
  y: SharedValue<number>;
  color: VertexColor;
};

const Vertex = memo(function ({ x, y, color }: VertexType) {
  return <Circle cx={x} cy={y} r={5} color={color} />;
});

type EdgeType = {
  v1: VertexType;
  v2: VertexType;
};

const Edge = memo(function ({ v1, v2 }: EdgeType) {
  const p1 = useDerivedValue(() => ({ x: v1.x.value, y: v1.y.value }));
  const p2 = useDerivedValue(() => ({ x: v2.x.value, y: v2.y.value }));

  return <Line p1={p1} p2={p2} strokeWidth={2} color="#333" />;
});

export default function MakeMutableExample() {
  const positionLimitsRef = useRef<Vector>();
  const [vertices, setVertices] = useState<VertexType[]>([]);
  const [edges, setEdges] = useState<EdgeType[]>([]);

  const addVertex = useCallback(
    (color: VertexColor) => {
      const randomVertex = randomChoice(vertices);
      const newVertex = createVertex(color, positionLimitsRef.current);
      setVertices([...vertices, newVertex]);
      if (randomVertex) {
        setEdges([...edges, { v1: randomVertex, v2: newVertex }]);
      }
    },
    [vertices, edges]
  );

  const removeVertex = useCallback(
    (index: number) => {
      setVertices(vertices.filter((_, i) => i !== index));
      setEdges(
        edges.filter(
          (edge) => edge.v1 !== vertices[index] && edge.v2 !== vertices[index]
        )
      );
    },
    [vertices, edges]
  );

  const animateVerticesWithColor = useCallback(
    (color: VertexColor) => {
      const verticesWithColor = vertices.filter((v) => v.color === color);
      verticesWithColor.forEach((vertex) => {
        const newPoint = randomPosition();
        vertex.x.value = withTiming(newPoint.x);
        vertex.y.value = withTiming(newPoint.y);
      });
    },
    [vertices]
  );

  return (
    <>
      <Canvas
        style={styles.fill}
        onLayout={({ nativeEvent }) => {
          positionLimitsRef.current = {
            x: nativeEvent.layout.width,
            y: nativeEvent.layout.height,
          };
        }}>
        {edges.map((edge, index) => (
          <Edge key={index} {...edge} />
        ))}
        {vertices.map((vertex, index) => (
          <Vertex key={index} {...vertex} />
        ))}
      </Canvas>

      <View style={styles.buttonsContainer}>
        <Button
          title="Add random vertex"
          onPress={() => addVertex(randomEnumValue(VertexColor))}
        />
        <Button
          title="Remove last vertex"
          onPress={() => removeVertex(vertices.length - 1)}
        />
        <Button
          title="Animate random color vertices"
          onPress={() => animateVerticesWithColor(randomEnumValue(VertexColor))}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 16,
    flexWrap: 'wrap',
    gap: 16,
  },
});
