import Animated, {
  useSharedValue,
  withTiming,
  useAnimatedStyle,
  Easing,
  executeOnUIRuntimeSync,
} from 'react-native-reanimated';
import { View, Button } from 'react-native';
import React from 'react';

function doRandomStuff(sv) {
  return executeOnUIRuntimeSync(() => {
    'worklet';
    console.log('Yollo', sv.value);
    return sv.value;
  })();
}

function AnimatedStyleUpdateExample(): React.ReactElement {
  const randomWidth = useSharedValue(10);

  const config = {
    duration: 500,
    easing: Easing.bezierFn(0.5, 0.01, 0, 1),
  };

  const style = useAnimatedStyle(() => {
    return {
      width: withTiming(randomWidth.value, config),
    };
  });

  return (
    <View
      style={{
        flex: 1,
        flexDirection: 'column',
      }}>
      <Animated.View
        style={[
          { width: 100, height: 80, backgroundColor: 'black', margin: 30 },
          style,
        ]}
      />
      <Button
        title="toggle"
        onPress={() => {
          const newValue = Math.random() * 350;
          randomWidth.value = newValue;
          console.log('HERE', randomWidth.value, newValue);
          const hh = doRandomStuff(randomWidth);
          console.log('AFTER', randomWidth.value, newValue, hh);
          // setTimeout(() => doRandomStuff(randomWidth), 50);
          // setTimeout(() => doRandomStuff(randomWidth), 150);
        }}
      />
    </View>
  );
}

export default AnimatedStyleUpdateExample;
