import {
  runOnJS,
  runOnUI,
  useSharedValue,
  doSomething,
} from 'react-native-reanimated';
import { View, Text, Button } from 'react-native';
import React, { useEffect, useState } from 'react';

// function triggerGC(repeat = 3) {
//   global.gc();
//   runOnUI(() => {
//     'worklet';
//     global.gc();
//     if (repeat > 1) {
//       runOnJS(triggerGC)(repeat - 1);
//     }
//   })();
// }

export default function AnimatedStyleUpdateExample(props) {
  const [obj, setObj] = useState();

  const randomObject = () => {
    const arr = [];
    for (let i = 0; i < 100; i++) {
      arr.push({
        key: i,
        value: Math.random(),
      });
    }

    return {
      id: Math.random(),
      arr,
    };
  };

  const test = useSharedValue();

  // useEffect(() => {
  //   const interval = setInterval(() => {
  //     setObj(randomObject());
  //   }, 500);

  //   return () => clearInterval(interval);
  // }, []);

  useEffect(() => {
    test.value = obj;
  }, [obj, test]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>Hello World</Text>
      <Text>{test.value ? test.value.id : ''}</Text>
      <Button title="do something" onPress={() => doSomething()} />
      <Button
        onPress={() => {
          setObj(randomObject());
        }}
        title="don't press me"
      />
      <Button
        onPress={() => {
          global.gc();
        }}
        title="GC RN"
      />
      <Button
        onPress={() => {
          runOnUI(() => {
            'worklet';
            global.gc();
          })();
        }}
        title="GC UI"
      />
      <Button
        onPress={() => {
          HermesInternal.ttiReached();
          runOnUI(() => {
            'worklet';
            HermesInternal.ttiReached();
          })();
        }}
        title="Print GC stats"
      />
    </View>
  );
}
