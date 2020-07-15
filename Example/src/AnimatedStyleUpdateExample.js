import Animated, {
  useSharedValue,
  withTiming,
  useAnimatedStyle,
  Easing,
  getViewProp,
} from 'react-native-reanimated';
import { View, Button, findNodeHandle } from 'react-native';
import React, { useRef } from 'react';

const Test = () => {
  const ref = useRef();
  let viewTag;
  const op = useSharedValue(0.5);

  const uas = useAnimatedStyle(() => {
    return {
      opacity: op.value,
    };
  });

  const handleOp = async () => {
    if (viewTag === undefined) {
      viewTag = findNodeHandle(ref.current);
    }
    op.value = op.value + 0.1;
    if (op.value > 1) {
      op.value = 0.1;
    }

    if (viewTag !== undefined) {
      const result = await getViewProp(viewTag, 'opacity');
      console.log('here ' + result);
    }
  };

  return (
    <View>
      <Button title="TEST" onPress={handleOp} />
      <Animated.View
        ref={ref}
        style={[
          uas,
          { backgroundColor: 'burlywood', zIndex: 55, width: 100, height: 100 },
        ]}
      />
    </View>
  );
};

export default function AnimatedStyleUpdateExample(props) {
  const randomWidth = useSharedValue(10);

  const config = {
    duration: 500,
    easing: Easing.bezier(0.5, 0.01, 0, 1),
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
          randomWidth.value = Math.random() * 350;
        }}
      />
      <Test />
    </View>
  );
}
