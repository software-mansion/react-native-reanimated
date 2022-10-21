import Animated, {
  runOnJS,
  runOnUI,
  useSharedValue,
  doSomething,
  useAnimatedStyle,
  withTiming,
  withSpring,
  useAnimatedScrollHandler,
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

  // useEffect(() => {
  //   const interval = setInterval(() => {
  //     setObj(randomObject());
  //   }, 500);

  //   return () => clearInterval(interval);
  // }, []);

  // useEffect(() => {
  //   test.value = obj;
  // }, [obj, test]);
  const opacity = useSharedValue(0.5);
  const translateX = useSharedValue(0);
  const stylez = useAnimatedStyle(() => {
    // _log('hello');
    console.log('OPACTIY ' + opacity.value);
    return {
      width: 50,
      height: 50,
      opacity: opacity.value,
      transform: [{ translateX: translateX.value }],
      backgroundColor: 'red',
    };
  });

  const scrollHandler = useAnimatedScrollHandler((e) => {
    opacity.value = Math.min(Math.max(0, e.contentOffset.y), 100) / 100;
  });

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>Hello World</Text>
      <Animated.View style={stylez} />
      <View
        style={{
          width: 100,
          height: 150,
          borderColor: 'black',
          borderWidth: 1,
        }}>
        <Animated.ScrollView onScroll={scrollHandler} scrollEventThrottle={1}>
          <View style={{ width: 100, height: 50, backgroundColor: 'red' }} />
          <View style={{ width: 100, height: 50, backgroundColor: 'blue' }} />
          <View style={{ width: 100, height: 50, backgroundColor: 'yellow' }} />
          <View style={{ width: 100, height: 50, backgroundColor: 'brown' }} />
          <View style={{ width: 100, height: 50, backgroundColor: 'plum' }} />
          <View style={{ width: 100, height: 50, backgroundColor: 'orange' }} />
        </Animated.ScrollView>
      </View>
      <Button title="do something" onPress={() => doSomething()} />
      <Button
        onPress={() => {
          opacity.value = withTiming(1);
          translateX.value = withSpring(100);
        }}
        title="animate"
      />
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
