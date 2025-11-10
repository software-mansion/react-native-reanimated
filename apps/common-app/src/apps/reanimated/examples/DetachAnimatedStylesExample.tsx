import React, { useCallback, useEffect, useRef } from 'react';
import { Button, StyleSheet, View } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

export default function DetachAnimatedStylesExample() {
  const [count, setCount] = React.useState(0);

  const [active1, setActive1] = React.useState(true);

  const [active2, setActive2] = React.useState(true);

  const sv = useSharedValue(0);

  const ref = useRef(0);

  useEffect(() => {
    // reset shared value and ref and fast refresh
    sv.value = 0;
    ref.current = 0;
  }, [sv]);

  const animatedStyle1 = useAnimatedStyle(() => {
    return {
      width: 20 + sv.value * 200,
    };
  });

  const animatedStyle2 = useAnimatedStyle(() => {
    return {
      backgroundColor: interpolateColor(sv.value, [0, 1], ['lime', 'blue']),
    };
  });

  useDerivedValue(() => {
    console.log(sv.value);
  }, []);

  const handleToggleSharedValue = useCallback(() => {
    ref.current = 1 - ref.current;
    sv.value = withTiming(ref.current);
  }, [sv]);

  const handleToggleActive1 = useCallback(() => {
    setActive1((a) => !a);
  }, []);

  const handleToggleActive2 = useCallback(() => {
    setActive2((a) => !a);
  }, []);

  const handleIncreaseCounter = useCallback(() => {
    setCount((c) => c + 1);
  }, []);

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.box,
          active1 && animatedStyle1,
          active2 && animatedStyle2,
        ]}
      />
      <Button title="Toggle shared value" onPress={handleToggleSharedValue} />
      <Button
        title={`${active1 ? 'Disable' : 'Enable'} Toggle width animated style`}
        onPress={handleToggleActive1}
      />
      <Button
        title={`${active2 ? 'Disable' : 'Enable'} Toggle color animated style`}
        onPress={handleToggleActive2}
      />
      <Button
        title={`Increase counter (${count})`}
        onPress={handleIncreaseCounter}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  box: {
    width: 100,
    height: 100,
    backgroundColor: 'black',
  },
});
