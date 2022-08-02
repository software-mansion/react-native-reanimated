import Animated, {
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Button, StyleSheet, View } from 'react-native';

import React from 'react';

const colors = [
  ['lime', 'green'],
  ['blue', 'cyan'],
];

export default function ChessboardExample() {
  const [state, setState] = React.useState(0);

  const ref = React.useRef(0);

  const sv = useSharedValue(0);

  const size = useDerivedValue(() => {
    return 10 + sv.value * 20;
  });

  const animatedStyle = useAnimatedStyle(() => {
    return {
      width: size.value,
      height: size.value,
    };
  }, []);

  const handleAnimateSize = () => {
    ref.current = 1 - ref.current;
    sv.value = withTiming(ref.current, { duration: 2000 });
  };

  const handleToggleColors = () => {
    setState((s) => 1 - s);
  };

  return (
    <>
      <View style={styles.buttons}>
        <Button onPress={handleAnimateSize} title="Animate size" />
        <Button onPress={handleToggleColors} title="Toggle colors" />
      </View>
      <View style={styles.chessboard}>
        <View style={styles.border}>
          {[...Array(12).keys()].map((i) => (
            <View style={styles.row} key={i}>
              {[...Array(12).keys()].map((j) => (
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
    </>
  );
}

const styles = StyleSheet.create({
  buttons: {
    marginVertical: 50,
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
