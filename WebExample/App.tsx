import { Button, StyleSheet, Text, View } from 'react-native';

import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { enableExperimentalWebImplementation } from 'react-native-gesture-handler';
import { useEffect, useState } from 'react';

enableExperimentalWebImplementation(true);

export default function App() {
  const [visible, setVisible] = useState(true);
  const [state, setState] = useState(false);

  const sv = useSharedValue(0);

  useEffect(() => {
    sv.value = withRepeat(
      withTiming(1, { duration: 1000, easing: Easing.linear }),
      -1
    );
  }, []);

  const animStyle = useAnimatedStyle(() => {
    console.log('xd');
    return {
      transform: [{ rotate: `${sv.value * 360}deg` }],
    };
  });

  const toggleVisibility = () => {
    setVisible((v) => !v);
  };

  const toggleOrder = () => {
    setState((s) => !s);
  };

  return (
    <View style={styles.container}>
      <Button title="Toggle visibility" onPress={toggleVisibility} />
      <Button title="Toggle order" onPress={toggleOrder} />
      <Animated.View
        style={[
          styles.flex,
          { alignItems: state ? 'flex-end' : 'flex-start' },
          state ? styles.override2 : {},
        ]}>
        {visible && (
          <Animated.View style={[styles.box, state ? styles.override : {}]}>
            <Text>Hello world!</Text>
            <Animated.View style={[styles.inner, animStyle]} />
          </Animated.View>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    paddingTop: 100,
  },
  box: {
    width: 120,
    height: 120,
    backgroundColor: 'cyan',
  },
  override: {
    // width: 250,
    // height: 250,
    // backgroundColor: 'green',
    width: 50,
    height: '100%',
  },
  override2: {
    width: 700,
    height: 250,
  },
  inner: {
    backgroundColor: 'black',
    width: 30,
    height: 30,
  },
  flex: {
    backgroundColor: 'lightgray',
    width: 600,
    height: 200,
  },
});
