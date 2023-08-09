import React from 'react';
import { Button, View, StyleSheet, Text } from 'react-native';
import Animated, {
  useSharedValue,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { useAnimatedStyle } from 'react-native-reanimated';

export default function App() {
  const scale = useSharedValue(1);
  const [finished, setFinished] = React.useState(false);

  const handlePress = () => {
    scale.value = withSpring(2, {}, () => {
      // highlight-next-line
      runOnJS(setFinished)(true);
    });
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.box, animatedStyle]} />
      <Button onPress={handlePress} title="Click me" disabled={finished} />
      {finished && <Text>Finished! 🎉</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
  },
  box: {
    height: 100,
    width: 100,
    backgroundColor: '#b58df1',
    borderRadius: 20,
    marginVertical: 64,
    alignSelf: 'center',
  },
});
