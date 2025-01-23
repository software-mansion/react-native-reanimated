import { Button, StyleSheet, View } from 'react-native';

import React from 'react';
import Animated, {
  measure,
  runOnUI,
  useAnimatedRef,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

export default function MeasureExample() {
  const aref = useAnimatedRef<Animated.View>();

  const ref = React.useRef(0);

  const sv = useSharedValue(0);

  const handleAnimateWidth = () => {
    ref.current = 1 - ref.current;
    sv.value = withTiming(ref.current, { duration: 1500 });
  };

  const handleMeasureFromJS = () => {
    aref.current?.measure?.((x, y, width, height, pageX, pageY) =>
      console.log(_WORKLET, { x, y, width, height, pageX, pageY })
    );
  };

  const handleMeasureFromUI = () => {
    runOnUI(() => {
      console.log(_WORKLET, '', measure(aref));
    })();
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
        <Button onPress={handleMeasureFromJS} title="Measure from JS" />
        <Button onPress={handleMeasureFromUI} title="Measure from UI" />
      </View>
      <Animated.View ref={aref} style={[styles.box, animatedStyle]} />
    </>
  );
}

const styles = StyleSheet.create({
  buttons: {
    marginTop: 80,
    marginBottom: 40,
  },
  box: {
    backgroundColor: 'navy',
    height: 80,
  },
});
