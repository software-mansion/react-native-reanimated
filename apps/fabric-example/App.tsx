import { useState } from 'react';
import { Button, StyleSheet, View } from 'react-native';
import { scheduleOnRN, scheduleOnUI } from 'react-native-worklets';

let arr = Array.from({ length: 100000 });
export default function App() {
  'use no memo';
  const [showBall, setShowBall] = useState(true);

  return (
    <View style={{ flex: 1, justifyContent: 'center' }}>
      {showBall && <Ball />}
      <Button
        title="Toggle Ball"
        onPress={() => setShowBall((prev) => !prev)}
      />
      <Button
        title="GC (top)"
        onPress={() => {
          arr = Array.from({ length: 100000 });
          gc();
        }}
      />
      <Button title="Print arr" onPress={() => console.log(arr)} />
    </View>
  );
}

function getCb() {
  const num = Math.random();
  return function callback1() {
    console.log(num);
  };
}

export function Ball() {
  const [state, setState] = useState({ x: Math.random(), y: Math.random() });
  arr = Array.from({ length: 100000 });
  const callback1 = getCb();

  return (
    <>
      <Button
        title="Rerender"
        onPress={() => setState({ x: Math.random(), y: Math.random() })}
      />
      <Button
        title="GC (bot)"
        onPress={() => {
          arr = Array.from({ length: 100000 });
          console.log(arr.length);
          gc();
          scheduleOnUI(() => {
            gc();
          });
        }}
      />
      <Button
        title="Run on UI"
        onPress={() => {
          scheduleOnUI((cb) => {
            scheduleOnRN(cb);
          }, callback1);
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  ball: {
    width: 100,
    height: 100,
    borderRadius: 100,
    backgroundColor: 'blue',
    alignSelf: 'center',
  },
});
