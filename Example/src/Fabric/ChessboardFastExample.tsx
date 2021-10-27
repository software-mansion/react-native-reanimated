import Animated, {
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Button, View } from 'react-native';

import React from 'react';

const colors = ['white', 'black'];

export default function ChessboardSlowExample() {
  const [state, setState] = React.useState(0);

  const x = useSharedValue(0);

  const size = useDerivedValue(() => 8 * (10 + x.value * 35));

  const style = useAnimatedStyle(
    () => ({
      width: size.value,
      height: size.value,
    }),
    []
  );

  const handleAnimate = () => {
    x.value = withTiming(1 - x.value, { duration: 3000 });
  };

  const handleToggle = () => {
    setState((state) => 1 - state);
  };

  return (
    <>
      <View style={{ marginTop: 100, marginBottom: 20 }}>
        <Button onPress={handleAnimate} title="Animate" />
        <Button onPress={handleToggle} title="Toggle" />
      </View>
      <Animated.View style={[{ borderWidth: 10, borderColor: 'lime' }, style]}>
        {[...Array(8).keys()].map((i) => (
          <View style={{ flexDirection: 'row', flex: 1 }} key={i}>
            {[...Array(8).keys()].map((j) => (
              <View
                style={{
                  backgroundColor: colors[(i + j + state) % 2],
                  flex: 1,
                }}
                key={j}
              />
            ))}
          </View>
        ))}
      </Animated.View>
    </>
  );
}
