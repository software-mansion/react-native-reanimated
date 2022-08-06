import { Button, StyleSheet, View, Text } from 'react-native';

import React from 'react';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

export default function WidthExample() {
  const [padding, setPadding] = React.useState(20);
  const [height, setHeight] = React.useState(80);
  const [fontSize, setFontSize] = React.useState(20);

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

  const handleIncreaseFontSize = () => {
    setFontSize((fs) => fs + 3);
  };

  const childStyle = useAnimatedStyle(() => {
    return {
      width: 80 + 230 * sv.value,
      borderWidth: 5 + sv.value * 20,
    };
  }, []);

  return (
    <View style={{ flex: 1 }} collapsable={false}>
      <View style={styles.buttons}>
        <Button onPress={handleAnimateWidth} title="Animate width" />
        <Button onPress={handleIncreasePadding} title="Increase padding" />
        <Button onPress={handleIncreaseHeight} title="Increase height" />
        <Button onPress={handleIncreaseFontSize} title="Increase font size" />
      </View>
      <View style={[styles.parent, { paddingVertical: padding }]}>
        <View collapsable={false} style={styles.middle}>
          <Animated.View style={[styles.left, { height }, childStyle]}>
            <Text style={{ fontSize, color: 'white' }}>42</Text>
          </Animated.View>
          <View style={styles.right} />
        </View>
      </View>
    </View>
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
  text: {
    fontSize: 40,
    color: 'white',
  },
});
