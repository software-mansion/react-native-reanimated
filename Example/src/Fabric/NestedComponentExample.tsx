import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Button, View } from 'react-native';

import React from 'react';

const Inner = React.forwardRef((_, ref) => {
  const [state, setState] = React.useState(0);

  const toggleState = () => {
    setState((state) => 1 - state);
  };

  React.useImperativeHandle(ref, () => {
    return { toggleState };
  });

  return (
    <View
      style={{
        backgroundColor: 'red',
        width: 50 + 50 * state,
        height: 50 + 50 * state,
      }}
    />
  );
});

export default function NestedComponentExample() {
  const x = useSharedValue(0);

  const ref = React.useRef();

  const style = useAnimatedStyle(() => {
    return { left: 200 * x.value };
  }, []);

  const handleToggleSharedValue = () => {
    x.value = withTiming(1 - x.value, { duration: 2000 });
  };

  const handleToggleState = () => {
    ref.current?.toggleState();
  };

  return (
    <>
      <View style={{ marginTop: 100 }} />
      <Button onPress={handleToggleSharedValue} title="Toggle shared value" />
      <Button onPress={handleToggleState} title="Toggle state" />
      <Animated.View
        style={[
          {
            position: 'absolute',
            top: 200,
            borderWidth: 20,
            borderColor: 'black',
          },
          style,
        ]}>
        <Inner ref={ref} />
      </Animated.View>
    </>
  );
}
