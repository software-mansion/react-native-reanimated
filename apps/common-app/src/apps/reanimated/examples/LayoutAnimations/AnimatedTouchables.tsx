import React, { useRef, useState } from 'react';
import { Button, StyleSheet, Text } from 'react-native';
import {
  GestureHandlerRootView,
  Touchable,
} from 'react-native-gesture-handler';
import Animated, { LinearTransition } from 'react-native-reanimated';

const AnimatedTouchable = Animated.createAnimatedComponent(Touchable);

interface Item {
  key: string;
}

const initialData: Item[] = Array.from({ length: 20 }, (_, i) => ({
  key: `${i}`,
}));

export default function AnimatedTouchables() {
  const [data, setData] = useState(initialData);
  const nextIdRef = useRef(1000);

  return (
    <GestureHandlerRootView style={styles.container}>
      <Button
        title="Remove first row"
        onPress={() => {
          setData((d) => d.slice(1));
        }}
      />
      <Button
        title="Prepend row"
        onPress={() => {
          const key = `${nextIdRef.current}`;
          nextIdRef.current += 1;
          setData((d) => [{ key }, ...d]);
        }}
      />
      {data.map((item) => (
        <AnimatedTouchable key={item.key} layout={LinearTransition}>
          <Text>Item {item.key}</Text>
        </AnimatedTouchable>
      ))}
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 80,
  },
});
