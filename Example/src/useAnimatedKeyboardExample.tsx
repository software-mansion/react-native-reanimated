import Animated, {
  useAnimatedStyle,
  useAnimatedKeyboard,
  withTiming,
} from 'react-native-reanimated';
import { View, Button, TextInput, StyleSheet, Keyboard } from 'react-native';
import React from 'react';

const BOX_SIZE = 50;

function AnimatedStyleUpdateExample(): React.ReactElement {
  const keyboard = useAnimatedKeyboard();
  const style = useAnimatedStyle(() => {
    return {
      backgroundColor: keyboard.isShown.value ? 'pink' : 'blue',
      borderRadius: withTiming(keyboard.isAnimating.value ? BOX_SIZE / 2 : 0),
    };
  });

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.box, style]} />
      <Button
        title="Dismiss"
        onPress={() => {
          Keyboard.dismiss();
        }}
      />
      <TextInput style={styles.textInput} />
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    marginVertical: 50,
  },
  box: { width: BOX_SIZE, height: BOX_SIZE, marginBottom: 200 },
  textInput: {
    borderColor: 'blue',
    borderStyle: 'solid',
    borderWidth: 2,
    height: 30,
    width: 200,
  },
});

export default AnimatedStyleUpdateExample;
