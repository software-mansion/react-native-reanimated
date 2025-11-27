import React, { useCallback } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  interpolateColor,
  setDynamicFeatureFlag,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

setDynamicFeatureFlag('FORCE_REACT_RENDER_FOR_SETTLED_ANIMATIONS', true);

const instructions = [
  '1. Press "Animate width and color" button',
  '2. Wait until the animated styles are synced back to React (about 3 seconds)',
  '3. Press "Increase counter" button',
  '4. The view width and color not change, similar to when the feature flag is disabled',
].join('\n');

interface ButtonProps {
  title: string;
  onPress: () => void;
}

function Button({ title, onPress }: ButtonProps) {
  // We use a custom button component because the one from React Native
  // triggers additional renders when pressed.

  return (
    <View onTouchEnd={onPress} style={styles.buttonView}>
      <Text style={styles.buttonText}>{title}</Text>
    </View>
  );
}

export default function SyncBackToReactExample() {
  const [count, setCount] = React.useState(0);

  const sv = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      width: 20 + sv.value * 200,
      backgroundColor: interpolateColor(sv.value, [0, 1], ['red', 'lime']),
    };
  });

  const handleAnimateWidth = useCallback(() => {
    sv.value = withSpring(Math.random());
  }, [sv]);

  const handleIncreaseCounter = useCallback(() => {
    setCount((c) => c + 1);
  }, []);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.box, animatedStyle]} />
      <Animated.View style={[styles.box, animatedStyle]} />
      <Animated.View style={[styles.box, animatedStyle]} />
      <Animated.View style={[styles.box, animatedStyle]} />
      <Animated.View style={[styles.box, animatedStyle]} />
      <Button title="Animate width and color" onPress={handleAnimateWidth} />
      <Text>Counter: {count}</Text>
      <Button title="Increase counter" onPress={handleIncreaseCounter} />
      <Text style={styles.instructions}>{instructions}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  box: {
    height: 20,
    backgroundColor: 'navy',
  },
  buttonView: {
    margin: 20,
  },
  buttonText: {
    fontSize: 20,
    color: 'dodgerblue',
  },
  instructions: {
    marginHorizontal: 20,
  },
});
