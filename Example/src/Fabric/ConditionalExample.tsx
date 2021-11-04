import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Button, View } from 'react-native';

import React from 'react';

export default function ConditionalExample() {
  const x = useSharedValue(0);

  const [state, setState] = React.useState(0);

  const style1 = useAnimatedStyle(() => {
    return { marginLeft: 270 * x.value };
  }, []);

  const style2 = useAnimatedStyle(() => {
    return { marginLeft: 80 * x.value };
  }, []);

  const handleToggleSharedValue = () => {
    x.value = withTiming(1 - x.value, { duration: 3000 });
  };

  const handleToggleState = () => {
    setState((state) => state + 1);
  };

  return (
    <>
      <View style={{ marginTop: 100 }} />
      <Button onPress={handleToggleSharedValue} title="Toggle shared value" />
      <Button onPress={handleToggleState} title="Toggle state" />
      <View style={{ marginTop: 100 }} />
      {state % 2 === 0 && (
        <Animated.View
          style={[{ width: 100, height: 100, backgroundColor: 'red' }, style1]}>
          <Animated.View
            style={[
              { width: 20, height: 20, backgroundColor: 'black' },
              style2,
            ]}
          />
        </Animated.View>
      )}
    </>
  );
}
