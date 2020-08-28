import React from 'react';
import { TapGestureHandler } from 'react-native-gesture-handler';
import { View, Button, Text } from 'react-native';
import Animated, {
  useAnimatedGestureHandler,
  useAnimatedState,
} from 'react-native-reanimated';

const AnimatedStateTest = () => {
  const [getState, setState] = useAnimatedState(0);

  console.log('render ' + getState());

  const handler = useAnimatedGestureHandler({
    onEnd: (_) => {
      setState(getState() + 1);
    },
  });

  return (
    <View>
      <TapGestureHandler onGestureEvent={handler}>
        <Animated.View
          style={{ height: 100, width: 100, backgroundColor: 'orange' }}
        />
      </TapGestureHandler>
      <Button
        title="press"
        onPress={() => {
          setState(getState() + 1);
        }}
      />
      <Text>
        Current state should change on button press(JS) and also on container
        press(UI): {getState()}
      </Text>
    </View>
  );
};

export default AnimatedStateTest;
