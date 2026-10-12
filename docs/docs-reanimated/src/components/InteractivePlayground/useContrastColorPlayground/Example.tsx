import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  contrastColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

interface ContrastColorProps {
  color: string;
}

export default function App({ color }: ContrastColorProps) {
  const backgroundColor = useSharedValue(color);

  useEffect(() => {
    backgroundColor.value = withTiming(color);
  }, [backgroundColor, color]);

  const boxStyle = useAnimatedStyle(() => {
    return {
      backgroundColor: backgroundColor.value,
    };
  });

  const textStyle = useAnimatedStyle(() => {
    return {
      color: contrastColor(backgroundColor.value),
    };
  });

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.box, boxStyle]}>
        <Animated.Text style={[styles.text, textStyle]}>
          Always readable
        </Animated.Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  box: {
    height: 150,
    width: 150,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontFamily: 'Aeonik',
    fontWeight: 'bold',
  },
});
