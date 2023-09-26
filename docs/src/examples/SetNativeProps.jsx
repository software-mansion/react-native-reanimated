import React from 'react';
import { Button, StyleSheet, View } from 'react-native';
import Animated, {
  runOnUI,
  setNativeProps,
  useAnimatedRef,
} from 'react-native-reanimated';

const COLORS = ['#FFE780', '#87CCE8', '#FFA3A1', '#B1DFD0', '#B58DF1'];

export default function Example() {
  const animatedRef = useAnimatedRef();

  const handlePress = () => {
    runOnUI(() => {
      // highlight-next-line
      setNativeProps(animatedRef, {
        backgroundColor: COLORS[Math.floor(Math.random() * COLORS.length)],
        // highlight-next-line
      });
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
  box: {
    height: 120,
    width: 120,
    backgroundColor: '#B58DF1',
    borderRadius: 20,
    marginBottom: 30,
  },
});
