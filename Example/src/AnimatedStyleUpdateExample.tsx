import Animated, {
  useSharedValue,
  withTiming,
  useAnimatedStyle,
  Easing,
  runOnUI
} from 'react-native-reanimated';
import { View, Button } from 'react-native';
import React from 'react';

function AnimatedStyleUpdateExample(): React.ReactElement {
  /* const Comp = () => {
    function A() {
      'worklet'
      throw "oooooo";
    }
    function B() {
      'worklet'
      try {
      A()
      } catch (e) {
      console.log("uuuu")
      }
    }
    runOnUI(() => {
      'worklet'
      B();
    })();
    return <View />;
  }; */

  const randomWidth = useSharedValue(10);

  const config = {
    duration: 500,
    easing: Easing.bezier(0.5, 0.01, 0, 1),
  };

  const wrk = () => {
    'worklet'
    throw 'eegege';
  }

  const style = useAnimatedStyle(() => {
    try {
      if (_WORKLET) {
        wrk();
      } else {
        console.log("ooo");
      }
      
    } catch (e) {
      console.log("hurra!");
    }
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
    </View>
  );
}

export default AnimatedStyleUpdateExample;
