import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
} from 'react-native-reanimated';

const duration = 1800;

export default function App() {
  const defaultAnim = useSharedValue(200);
  const changedAnim = useSharedValue(200);

  const animatedLinear = useAnimatedStyle(() => ({
    transform: [{ translateX: defaultAnim.value }],
  }));
  const animatedChanged = useAnimatedStyle(() => ({
    transform: [{ translateX: changedAnim.value }],
  }));

  React.useEffect(() => {
    defaultAnim.value = withRepeat(
      // highlight-next-line
      withSpring(-defaultAnim.value),
      -1,
      true
    );
    changedAnim.value = withRepeat(
      // highlight-start
      withSpring(-changedAnim.value, {
        mass: 10,
        damping: 40,
      }),
      // highlight-end
      -1,
      true
    );
  }, []);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.box, animatedLinear]}>
        <Text style={styles.text}>Default</Text>
      </Animated.View>
      <Animated.View style={[styles.box, animatedChanged]}>
        <Text style={styles.text}>Heavy</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  box: {
    height: 80,
    width: 80,
    margin: 20,
    borderWidth: 1,
    borderColor: '#b58df1',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: '#b58df1',
    textTransform: 'uppercase',
    fontWeight: 'bold',
  },
});
