import React, { useCallback } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

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

export default function App() {
  const [count, setCount] = React.useState(0);

  const sv = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      width: 20 + sv.value * 200,
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
      <Button title="Animate width" onPress={handleAnimateWidth} />
      <Text>Counter: {count}</Text>
      <Button title="Increase counter" onPress={handleIncreaseCounter} />
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
    height: 50,
    backgroundColor: 'navy',
  },
  buttonView: {
    margin: 20,
  },
  buttonText: {
    fontSize: 20,
    color: 'dodgerblue',
  },
});
