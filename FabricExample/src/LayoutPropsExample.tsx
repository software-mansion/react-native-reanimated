import { Button, StyleSheet, View } from 'react-native';

import React from 'react';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

export default function LayoutPropsExample() {
  const [height, setHeight] = React.useState(100);
  const ref = React.useRef(0);
  const sv = useSharedValue(0);

  const handleIncreaseHeight = () => {
    setHeight((h) => h + 30);
  };

  const handleAnimateWidth = () => {
    ref.current = 1 - ref.current;
    sv.value = withTiming(ref.current, { duration: 1000 });
  };

  const animatedStyle = useAnimatedStyle(() => {
    return {
      width: 100 + 150 * sv.value,
    };
  }, []);

  return (
    <>
      <View style={styles.buttons}>
        <Button onPress={handleIncreaseHeight} title="Increase height" />
        <Button onPress={handleAnimateWidth} title="Animate width" />
      </View>
      <View style={styles.parent}>
        <Animated.View style={[styles.alice, { height }, animatedStyle]} />
        <View style={styles.bob} />
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
  alice: {
    backgroundColor: 'blue',
  },
  bob: {
    backgroundColor: 'lime',
    flex: 1,
  },
});
