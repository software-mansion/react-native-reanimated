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

  const size = useDerivedValue(() => {
    return 10 + x.value * 35;
  });

  const style = useAnimatedStyle(() => {
    return {
      width: size.value,
      height: size.value,
    };
  }, []);

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
      <View style={{ alignItems: 'flex-start' }}>
        <View
          style={{
            borderWidth: 10,
            borderColor: 'lime',
          }}>
          {[...Array(8).keys()].map((i) => (
            <View style={{ flexDirection: 'row' }} key={i}>
              {[...Array(8).keys()].map((j) => (
                <Animated.View
                  key={j}
                  style={[
                    { backgroundColor: colors[(i + j + state) % 2] },
                    style,
                  ]}
                />
              ))}
            </View>
          ))}
        </View>
      </View>
    </>
  );
}
