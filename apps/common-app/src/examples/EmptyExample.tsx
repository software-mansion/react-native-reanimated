import { Text, StyleSheet, View } from 'react-native';
import { Bezier } from 'react-native-reanimated/src/Bezier';

import React, { useState } from 'react';

function functionsAreEqual(
  fun1: (x: number) => number,
  fun2: (x: number) => number
) {
  let heighest = 0;
  const points = Array.from(Array(100).keys()).map((x) => x / 100);
  points.forEach((point) => {
    const diff = Math.abs(fun1(point) - fun2(point));

    if (diff > heighest) {
      heighest = diff;
    }
  });

  return heighest;
}

const testingIteration = () => {
  const a = Math.random();
  const b = Math.random();
  const c = Math.random();
  const d = Math.random();

  const easing1 = Bezier(a, b, c, d);
  const easing2 = Bezier(b, a, d, c);

  const almostIdentity = (x: number) => easing1(easing2(x));

  return functionsAreEqual(almostIdentity, (x: number) => x);
};

export default function EmptyExample() {
  const [temp, setTemp] = useState<number>(0);

  let totalPrecision = 0;
  const start = Date.now();

  const N_MEASURED = 10000;

  for (let i = 0; i < N_MEASURED; i++) {
    totalPrecision += testingIteration();
  }

  const timeTaken = Date.now() - start;
  const averagePrecision = totalPrecision / N_MEASURED;

  console.log('--- --- ---');
  console.log();
  console.log('SAMPLE SIZE:', N_MEASURED);
  console.log('BEZIER SAMPLES:', 11);
  console.log();

  console.log('average precision:', averagePrecision);
  console.log('average time taken:', timeTaken / N_MEASURED, 'ms');

  return (
    <View style={styles.container} onTouchStart={() => setTemp(temp + 1)}>
      <Text>Hello world! {temp}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: 50,
    backgroundColor: 'white',
  },
});
