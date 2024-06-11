import React from 'react';
import Animated, {
  useAnimatedKeyboard,
  useAnimatedStyle,
} from 'react-native-reanimated';
import { StyleSheet, TextInput, View, useColorScheme } from 'react-native';

export default function App() {
  const colorScheme = useColorScheme();
  const keyboard = useAnimatedKeyboard();

  const animatedStyles = useAnimatedStyle(() => ({
    transform: [{ translateY: -keyboard.height.value }],
  }));

  return (
    <Animated.View
      style={[
        styles.container,
        animatedStyles,
        { backgroundColor: colorScheme === 'light' ? '#fff' : '#000' },
      ]}>
      <View style={styles.box}>
        <TextInput placeholder="Text Input" />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    borderWidth: 5,
    borderColor: '#782aeb',
    borderRadius: 2,
  },
  box: {
    justifyContent: 'center',
    alignItems: 'center',
    height: 200,
    backgroundColor: '#b58df1',
    borderRadius: 5,
    margin: 20,
  },
});
