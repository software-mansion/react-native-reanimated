import Animated, {
  SlideInLeft,
  SlideOutDown,
  useSharedValue,
  withTiming,
  useAnimatedStyle,
  Easing,
  runOnUI,
} from 'react-native-reanimated';
import { View, Button } from 'react-native';
import React, { useState } from 'react';

function AnimatedStyleUpdateExample(): React.ReactElement {
  // const randomWidth = useSharedValue(10, true);

  // const config = {
  //   duration: 500,
  //   easing: Easing.bezierFn(0.5, 0.01, 0, 1),
  // };

  // const style = useAnimatedStyle(() => {
  //   return {
  //     width: withTiming(randomWidth.value, config),
  //   };
  // });

  const [show, setShow] = useState(false);

  return (
    <View
      style={{
        flex: 1,
        flexDirection: 'column',
      }}>
      {show && (
        <Animated.View
          entering={SlideInLeft}
          exiting={SlideOutDown}
          style={[
            { width: 100, height: 80, backgroundColor: 'black', margin: 30 },
          ]}
        />
      )}
      <Button
        title="toggle"
        onPress={() => {
          setShow(!show);
          // randomWidth.value = withTiming(Math.random() * 350);
        }}
      />
    </View>
  );
}

export default AnimatedStyleUpdateExample;
