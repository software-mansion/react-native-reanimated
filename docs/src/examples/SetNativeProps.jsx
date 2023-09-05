import React from 'react';
import Animated, {
  runOnUI,
  setNativeProps,
  useAnimatedRef,
} from 'react-native-reanimated';
import { Button, StyleSheet, View } from 'react-native';

export default function Example() {
  const animatedRef = useAnimatedRef();

  const handlePress = () => {
    runOnUI(() => {
      setNativeProps(animatedRef, { backgroundColor: 'blue' });
    })();
  };

  return (
    <View style={styles.container}>
      <Animated.View ref={animatedRef} style={styles.box} />
      <Button title="change color" onPress={handlePress} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  box: { width: 100, height: 100, backgroundColor: 'red' },
});
