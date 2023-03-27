import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import {
  Gesture,
  GestureDetector,
  enableExperimentalWebImplementation,
} from 'react-native-gesture-handler';
import { StyleSheet, View, Text } from 'react-native';
import { WithoutBabelTest } from './WithoutBabel';

enableExperimentalWebImplementation(true);

export default function App() {
  const isPressed = useSharedValue(false);
  const offset = useSharedValue({ x: 0, y: 0 });

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: offset.value.x },
        { translateY: offset.value.y },
        { scale: withSpring(isPressed.value ? 1.2 : 1) },
      ],
      backgroundColor: isPressed.value ? 'blue' : 'navy',
      cursor: isPressed.value ? 'grabbing' : 'grab',
    };
  });

  const gesture = Gesture.Pan()
    .manualActivation(true)
    .onBegin(() => {
      'worklet';
      isPressed.value = true;
    })
    .onChange((e) => {
      'worklet';
      offset.value = {
        x: e.changeX + offset.value.x,
        y: e.changeY + offset.value.y,
      };
    })
    .onFinalize(() => {
      'worklet';
      isPressed.value = false;
    })
    .onTouchesMove((_, state) => {
      state.activate();
    });

  return (
    <View style={styles.container}>
      <GestureDetector gesture={gesture}>
        <Animated.View style={[styles.ball, animatedStyle]}>
          <Text style={styles.text}>I need Babel plugin</Text>
        </Animated.View>
      </GestureDetector>
      <WithoutBabelTest />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ball: {
    width: 100,
    height: 100,
    borderRadius: 100,
    backgroundColor: 'blue',
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    color: 'white',
    textAlign: 'center',
  },
});
