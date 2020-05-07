import React from 'react';
import { View, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useEventWorklet,
} from 'react-native-reanimated';
import { PanGestureHandler } from 'react-native-gesture-handler';
import { useAnimatedStyle } from '../../src/reanimated2/Hooks';

function UseAnimatedStyleTest() {
  const prevX = useSharedValue(0);
  const prevY = useSharedValue(0);
  const totalX = useSharedValue(0);
  const totalY = useSharedValue(0);
  const velocityX = useSharedValue(0);
  const velocityY = useSharedValue(0);
  const parentWidth = useSharedValue(Dimensions.get('window').width);
  const parentHeight = useSharedValue(Dimensions.get('window').height);

  const squareStyle = useAnimatedStyle(
    function(input) {
      'worklet';
      return {
        position: 'absolute',
        width: 40,
        height: 40,
        transform: [
          {
            translateX: input.parentWidth.value - input.totalX.value - 40,
          },
          {
            translateY: input.parentHeight.value - input.totalY.value - 40,
          },
        ],
      };
    },
    { parentWidth, parentHeight, totalX, totalY }
  );

  const transform1 = useAnimatedStyle(
    function(input) {
      'worklet';
      return [
        {
          translateX:
            input.parentWidth.value -
            input.squareStyle.transform[0].translateX.value -
            40,
        },
        input.squareStyle.transform[1],
      ];
    },
    { parentWidth, parentHeight, squareStyle }
  );

  const transform2 = useAnimatedStyle(
    function(input) {
      'worklet';
      return [
        input.squareStyle.transform[0],
        {
          translateY:
            input.parentHeight.value -
            input.squareStyle.transform[1].translateY.value -
            40,
        },
      ];
    },
    { parentWidth, parentHeight, squareStyle }
  );

  const worklet = useEventWorklet(
    function(prevX, prevY, totalX, totalY, velocityX, velocityY) {
      'worklet';
      if (this.event.state === 2) {
        prevX.set(totalX.value);
        prevY.set(totalY.value);
      }
      totalX.set(this.event.translationX + prevX.value);
      totalY.set(this.event.translationY + prevY.value);
      if (this.event.state === 5) {
        velocityX.set(this.event.velocityX);
        velocityY.set(this.event.velocityY);
      }
    },
    [prevX, prevY, totalX, totalY, velocityX, velocityY]
  );
  return (
    <View
      style={{ flex: 1 }}
      onLayout={e => {
        parentHeight.set(e.nativeEvent.layout.height);
        parentWidth.set(e.nativeEvent.layout.width);
      }}>
      <PanGestureHandler
        onGestureEvent={worklet}
        onHandlerStateChange={worklet}>
        <Animated.View
          style={{
            position: 'absolute',
            width: 40,
            height: 40,
            transform: [
              {
                translateX: totalX,
              },
              {
                translateY: totalY,
              },
            ],
            backgroundColor: 'black',
          }}
        />
      </PanGestureHandler>
      <Animated.View style={[squareStyle, { backgroundColor: 'blue' }]} />
      <Animated.View
        style={{
          position: 'absolute',
          width: 40,
          height: 40,
          transform: transform1,
          backgroundColor: 'red',
        }}
      />
      <Animated.View
        style={{
          position: 'absolute',
          width: 40,
          height: 40,
          transform: transform2,
          backgroundColor: 'yellow',
        }}
      />
    </View>
  );
}

export default UseAnimatedStyleTest;
