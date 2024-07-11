import { Text, StyleSheet, View } from 'react-native';

import React, { useEffect, useState } from 'react';
import {
  makeMutable,
  useAnimatedReaction,
  withTiming,
} from 'react-native-reanimated';

export default function App() {
  const [counter, setCounter] = useState(0);
  const mv = makeMutable(counter);

  useEffect(() => {
    const interval = setInterval(() => {
      setCounter((prev) => prev + 1);
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [mv]);

  useAnimatedReaction(
    () => mv.value,
    (value) => {
      console.log(value);
    }
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
