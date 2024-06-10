import { Button, StyleSheet, View } from 'react-native';

import React from 'react';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

export default function WidthExample() {
  const [padding, setPadding] = React.useState(20);
  const [height, setHeight] = React.useState(80);

  const sv = useSharedValue(0);

  const handleAnimateWidth = () => {
    sv.value = withTiming(Math.random(), { duration: 300 });
  };

  const handleIncreasePadding = () => {
    setPadding((p) => p + 3);
  };

  const handleIncreaseHeight = () => {
    setHeight((h) => h + 10);
  };

  const childStyle = useAnimatedStyle(() => {
    return {
      width: 80 + 230 * sv.value,
    };
  }, []);

  return (
    <>
      <View style={styles.buttons}>
        <Button onPress={handleAnimateWidth} title="Animate width" />
        <Button onPress={handleIncreasePadding} title="Increase padding" />
        <Button onPress={handleIncreaseHeight} title="Increase height" />
      </View>
      <View style={[styles.parent, { paddingVertical: padding }]}>
        <View collapsable={false} style={styles.middle}>
          <Animated.View style={[styles.left, { height }, childStyle]} />
          <View style={styles.right} />
        </View>
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
    backgroundColor: 'red',
    paddingHorizontal: 20,
  },
  middle: {
    flexDirection: 'row',
    flex: 1,
  },
  left: {
    backgroundColor: 'blue',
  },
  right: {
    backgroundColor: 'lime',
    flex: 1,
  },
});
