import Animated, {
  useSharedValue,
  withTiming,
  useAnimatedStyle,
} from 'react-native-reanimated';
import { View, Button, StyleSheet } from 'react-native';
import React from 'react';

export default function App() {
  const offset = useSharedValue(0);

  // highlight-start
  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: offset.value }],
  }));
  // highlight-end

  const OFFSET = 40;

  const handlePress = () => {
    // highlight-next-line
    offset.value = withTiming(OFFSET);
  };

  return (
    <View style={styles.container}>
      {/* highlight-next-line */}
      <Animated.View style={[styles.box, style]} />
      <Button title="shake" onPress={handlePress} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
  },
  box: {
    width: 100,
    height: 100,
    margin: 50,
    borderRadius: 15,
    backgroundColor: '#b58df1',
  },
});
