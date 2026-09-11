import { Button, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';

export default function SynchronousPropsOverwriteExample() {
  const offset = useSharedValue(0);
  const height = useSharedValue(100);

  const transformStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: offset.value }],
  }));
  const heightStyle = useAnimatedStyle(() => ({ height: height.value }));

  return (
    <View style={styles.container}>
      <Button
        title="Move, then resize"
        onPress={() => {
          offset.value = offset.value === 0 ? 100 : 0;
          setTimeout(() => {
            height.value = height.value === 100 ? 150 : 100;
          }, 100);
        }}
      />
      <Text>The box should stay at its new position when it resizes.</Text>
      <Animated.View
        testID="sync-props-box"
        style={[styles.box, transformStyle, heightStyle]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    gap: 20,
  },
  box: {
    width: 100,
    backgroundColor: 'purple',
  },
});
