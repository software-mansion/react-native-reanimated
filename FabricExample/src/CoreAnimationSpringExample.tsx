import { StyleSheet, View, Button } from 'react-native';

import React from 'react';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

function SpringBox({ backgroundColor, i, state }) {
  const sv = useSharedValue(0);

  React.useEffect(() => {
    setTimeout(() => {
      sv.value = withSpring(state * (50 + i * 10), {
        stiffness: 400,
        damping: 8,
      });
    }, i * 50);
  }, [sv, i, state]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: sv.value }],
    };
  });

  return (
    <Animated.View style={[styles.box, { backgroundColor }, animatedStyle]} />
  );
}

const COLORS = ['tomato', 'gold', 'lime', 'deepskyblue', 'violet'];

export default function CoreAnimationSpringExample() {
  const [state, setState] = React.useState(0);

  const handlePress = () => {
    setState((s) => (s === 1 ? -1 : 1));
  };

  return (
    <View style={styles.container}>
      <Button title="Animate" onPress={handlePress} />
      <View style={styles.vspace} />
      {COLORS.map((backgroundColor, i) => (
        <SpringBox
          key={backgroundColor}
          backgroundColor={backgroundColor}
          i={i}
          state={state}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vspace: {
    height: 40,
  },
  box: {
    width: 60,
    height: 60,
    marginVertical: 8,
  },
});
