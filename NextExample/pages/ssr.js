import Animated, {
  PinwheelIn,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { StyleSheet, View } from 'react-native';

import { useEffect } from 'react';

export default function App(props) {
  const sv = useSharedValue(0);

  useEffect(() => {
    sv.value = 0;
    sv.value = withRepeat(withTiming(1), -1, true);
  });

  const animatedStyle = useAnimatedStyle(() => {
    return {
      width: sv.value * props.width + 10,
    };
  });

  return (
    <View style={styles.container}>
      <Animated.View
        entering={PinwheelIn}
        style={[styles.box, animatedStyle]}
      />
    </View>
  );
}

export async function getServerSideProps() {
  return { props: { width: Math.random() * 200 } };
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'grey',
    alignItems: 'center',
    justifyContent: 'center',
  },
  box: {
    height: 100,
    backgroundColor: 'blue',
  },
});
