import { Button, StyleSheet, View } from 'react-native';

import React from 'react';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

export default function WidthExample() {
  const [height, setHeight] = React.useState(80);

  const ref = React.useRef(0);

  const sv = useSharedValue(0);

  const handleAnimateWidth = () => {
    ref.current = 1 - ref.current;
    sv.value = withTiming(ref.current, { duration: 1500 });
  };

  const handleIncreaseHeight = () => {
    setHeight((h) => h + 10);
  };

  const animatedStyle = useAnimatedStyle(() => {
    return {
      width: 80 + 230 * sv.value,
    };
  }, []);

  return (
    <>
      <View style={styles.buttons}>
        <Button onPress={handleAnimateWidth} title="Animate width" />
        <Button onPress={handleIncreaseHeight} title="Increase height" />
      </View>
      <View style={styles.parent}>
        <Animated.View style={[styles.left, { height }, animatedStyle]} />
        <View style={styles.right} />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  buttons: {
    marginTop: 80,
    marginBottom: 40,
  },
  parent: {
    flexDirection: 'row',
  },
  left: {
    backgroundColor: 'blue',
  },
  right: {
    backgroundColor: 'lime',
    flex: 1,
  },
});
