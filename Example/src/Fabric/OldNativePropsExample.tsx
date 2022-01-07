import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { Button, Text, View } from 'react-native';

import React from 'react';

export default function OldNativePropsExample() {
  const [, setState] = React.useState(0);

  const fontSize = useSharedValue(14);

  const style = useAnimatedStyle(() => {
    return { fontSize: fontSize.value };
  }, []);

  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <Button
        onPress={() => {
          fontSize.value = withSpring(Math.random() * 40 + 10);
        }}
        title="click me"
      />
      <Animated.Text style={style} onPress={() => setState(Math.random())}>
        lorem ipsum
      </Animated.Text>
      <Text>sit dolor amet</Text>
    </View>
  );
}
