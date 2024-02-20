import { Button, StyleSheet, View } from 'react-native';
import Animated, {
  BounceIn,
  BounceInUp,
  CurvedTransition,
  EntryExitAnimationFunction,
  FadeInUp,
  FadeOutLeft,
  FadingTransition,
  LayoutAnimationFunction,
  LinearTransition,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import React, { useEffect } from 'react';

const custom: LayoutAnimationFunction = (values) => {
  'worklet';
  return {
    animations: {
      transform: [{ rotate: withTiming('45deg') }],
      opacity: withTiming(1),
    },
    initialValues: { transform: [{ rotate: '0deg' }], opacity: 0 },
  };
};

const custom2: EntryExitAnimationFunction = (values) => {
  'worklet';
  console.log(values);
  return {
    animations: {
      originY: withTiming(300),
      opacity: 1,
    },
    initialValues: { originY: 0, opacity: 1 },
  };
};

export default function EmptyExample() {
  const [show, setShow] = React.useState(true);
  const [show2, setShow2] = React.useState(false);
  const [refresher, setRefresher] = React.useState(false);
  const sv = useSharedValue(0);
  const animatedStyle = useAnimatedStyle(() => {
    return {
      // transform: [{ translateX: sv.value }],
      height: 100 + sv.value,
    };
  });

  // useEffect(() => {
  //   sv.value = withTiming(100, { duration: 1000 });
  // }, [sv]);

  return (
    <View style={styles.container}>
      {/* <View style={styles.box} /> */}
      {/* <Animated.View style={[styles.box, animatedStyle]} /> */}
      <Button title="toggle" onPress={() => setShow(!show)} />
      <Button title="toggle" onPress={() => setShow2(!show2)} />
      {/* <Button
        title="start"
        onPress={() => {
          sv.value = withTiming(100, { duration: 1000 });
        }}
      /> */}
      {show && (
        <Animated.View
          onTouchStart={() => setShow(!show)}
          // onLayout={() => {}}
          layout={LinearTransition}
          style={styles.box}
          // exiting={FadeOutLeft}
        />
      )}
      {show2 && (
        <Animated.View
          entering={FadeInUp}
          // onLayout={() => {}}
          layout={LinearTransition}
          onTouchStart={() => setRefresher(!refresher)}
          style={styles.refresher}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    marginTop: 200,
    backgroundColor: 'black',
    // justifyContent: 'center',
  },
  box: {
    marginTop: 10,
    width: 200,
    height: 100,
    backgroundColor: 'tomato',
  },
  refresher: {
    marginTop: 10,
    width: 100,
    height: 100,
    backgroundColor: 'blue',
    opacity: 0.5,
  },
});
