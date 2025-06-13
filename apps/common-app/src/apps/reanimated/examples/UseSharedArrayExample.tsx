import { Button, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedArray,
} from 'react-native-reanimated';

const randomIntNumber = (min: number, max: number) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

export default function UseSharedArrayExample() {
  const sharedValue = useSharedArray([100, 200]);

  const animatedStyleElement1 = useAnimatedStyle((registry) => {
    console.log('AnimatedStyleElement1 updated...');
    registry?.registerForUpdates(sharedValue, [0]);
    return {
      width: sharedValue.value[0],
    };
  });

  const animatedStyleElement2 = useAnimatedStyle((registry) => {
    console.log('AnimatedStyleElement2 updated...');
    registry?.registerForUpdates(sharedValue, [1]);
    return {
      width: sharedValue.value[1],
    };
  });

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.box, animatedStyleElement1]} />
      <Animated.View style={[styles.box, animatedStyleElement2]} />
      <Button
        title="Change element 1"
        onPress={() => {
          sharedValue.modifyValue(0, randomIntNumber(100, 200));
        }}
      />
      <Button
        title="Change element 2"
        onPress={() => {
          sharedValue.modifyValue(1, randomIntNumber(100, 200));
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  box: {
    backgroundColor: 'red',
    height: 100,
  },
});
