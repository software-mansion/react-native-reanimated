import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

// TODO: make sure that React render doesn't overwrite the text
// TODO: add support for the following syntax: <Animated.Text>{sharedValue}</Animated.Text>
// TODO: add support for the following syntax: <Animated.Text>Before {sharedValue} After</Animated.Text>

export default function App() {
  const sv = useSharedValue(0);

  useEffect(() => {
    sv.value = 0;
    sv.value = withRepeat(withTiming(100, { duration: 1500 }), -1, true);
  }, [sv]);

  const animatedProps = useAnimatedProps(() => {
    return {
      text: `${Math.round(sv.value)}`,
    };
  });

  return (
    <View style={styles.container}>
      <Text>Left</Text>
      {/* @ts-expect-error TODO fix animated props type */}
      <Animated.Text animatedProps={animatedProps} style={styles.text} />
      <Text>Right</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 80,
    fontVariant: ['tabular-nums'],
    borderColor: 'red',
    borderWidth: 2,
  },
});
