import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

// TODO: add support for the following syntax: <Animated.Text>{sharedValue}</Animated.Text>
// TODO: add support for the following syntax: <Animated.Text>Before {sharedValue} After</Animated.Text>
// TODO: add TypeScript validation that allows <Animated.Text> to either have children or have `text` animated prop
// TODO: add gauges example
// TODO: sync `text` prop updates back to React as `children` prop
// TODO: support both string and number as text animated prop
// TODO: convert docs examples from AnimatedTextInput to Animated.Text

export default function AnimatedTextExample() {
  const sv = useSharedValue(0);

  useEffect(() => {
    sv.value = 0;
    sv.value = withRepeat(withTiming(100, { duration: 1500 }), -1, true);
  }, [sv]);

  const animatedProps = useAnimatedProps(() => {
    return {
      text: Math.round(sv.value),
    };
  });

  const animatedStyle = useAnimatedStyle(() => {
    return {
      fontSize: 20 + sv.value,
    };
  });

  return (
    <View style={styles.container}>
      <Text style={styles.cyan}>
        <Text style={styles.bold}>
          Before
          <Animated.Text
            // @ts-expect-error TODO fix animated props type
            animatedProps={animatedProps}
            style={[styles.text, animatedStyle]}
          />
        </Text>
        After
      </Text>
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
  cyan: {
    backgroundColor: 'limegreen',
  },
  bold: {
    fontWeight: 'bold',
  },
  text: {
    backgroundColor: 'lime',
    fontVariant: ['tabular-nums'],
  },
});
