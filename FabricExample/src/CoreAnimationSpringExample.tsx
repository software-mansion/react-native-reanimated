import { StyleSheet, View, Button } from 'react-native';

import React from 'react';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

function SpringBox({ offset, backgroundColor }) {
  const sv = useSharedValue(0);

  React.useEffect(() => {
    sv.value = withSpring(offset, { stiffness: 300, damping: 5 });
  }, [sv, offset]);

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
  const [state, setState] = React.useState(1);

  const handlePress = () => {
    setState((s) => s * -1);
  };

  return (
    <View style={styles.container}>
      <Button title="Animate" onPress={handlePress} />
      <View style={styles.vspace} />
      {COLORS.map((backgroundColor, i) => (
        <SpringBox
          key={backgroundColor}
          backgroundColor={backgroundColor}
          offset={state * (40 + i * 15)}
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
