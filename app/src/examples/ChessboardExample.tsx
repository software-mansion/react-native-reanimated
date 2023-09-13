import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';

const colors = [
  ['lime', 'green'],
  ['blue', 'cyan'],
];

function useLoop() {
  const sv = useSharedValue(0);

  useEffect(() => {
    sv.value = 0;
    sv.value = withRepeat(withTiming(1, { duration: 1000 }), -1, true);
  }, [sv]);

  return sv;
}

const N = 12;

export default function ChessboardExample() {
  const [state, setState] = React.useState(0);

  const sv = useLoop();

  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    if (shouldReduceMotion) {
      return;
    }
    const id = setInterval(() => {
      setState((s) => 1 - s);
    }, 10);
    return () => clearInterval(id);
  }, [shouldReduceMotion]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      width: 10 + sv.value * 20,
      height: 10 + sv.value * 20,
    };
  }, []);

  return (
    <View style={styles.workaround} collapsable={false}>
      <View style={styles.chessboard}>
        <View style={styles.border}>
          {[...Array(N).keys()].map((i) => (
            <View style={styles.row} key={i}>
              {[...Array(N).keys()].map((j) => (
                <Animated.View
                  key={j}
                  style={[
                    { backgroundColor: colors[state % 2][(i + j) % 2] },
                    animatedStyle,
                  ]}
                />
              ))}
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  workaround: {
    height: 400,
    // prevents calling _state->updateState from RNScreens after each change because of view flattening
  },
  chessboard: {
    alignItems: 'flex-start',
  },
  border: {
    borderWidth: 10,
    borderColor: 'red',
  },
  row: {
    flexDirection: 'row',
  },
});
