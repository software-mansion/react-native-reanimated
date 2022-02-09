import Animated, {
  useAnimatedStyle,
  useAnimatedKeyboard,
} from 'react-native-reanimated';
import { View, Button, TextInput, StyleSheet, Keyboard } from 'react-native';
import React from 'react';

function AnimatedStyleUpdateExample(): React.ReactElement {
  const keyboard = useAnimatedKeyboard();
  const style = useAnimatedStyle(() => {
    return {
      backgroundColor: keyboard.isShown.value ? 'pink' : 'blue',
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
  box: { width: 50, height: 50, marginBottom: 200 },
  textInput: {
    borderColor: 'blue',
    borderStyle: 'solid',
    borderWidth: 2,
    height: 30,
    width: 200,
  },
});

export default AnimatedStyleUpdateExample;
