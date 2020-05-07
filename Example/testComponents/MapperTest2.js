import React from 'react';
import { Text, View, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useMapper,
  useEventWorklet,
} from 'react-native-reanimated';
import { PanGestureHandler } from 'react-native-gesture-handler';

function MapperTest2() {
  const prevX = useSharedValue(0);
  const prevY = useSharedValue(0);
  const totalX = useSharedValue(0);
  const totalY = useSharedValue(0);
  const velocityX = useSharedValue(0);
  const velocityY = useSharedValue(0);
  const parentWidth = useSharedValue(Dimensions.get('window').width);
  const parentHeight = useSharedValue(Dimensions.get('window').height);
  const mappedX = useSharedValue(100);
  const mappedY = useSharedValue(100);

  const mappedX1 = useSharedValue(0);
  const mappedY1 = useSharedValue(100);

  const mappedX2 = useSharedValue(100);
  const mappedY2 = useSharedValue(0);

  const mapper = useMapper(
    function(input, output) {
      'worklet';
      output.totalX.set(input.parentWidth.value - input.totalX.value - 40);
      output.totalY.set(input.parentHeight.value - input.totalY.value - 40);
    },
    [
      { totalX, totalY, parentHeight, parentWidth },
      { totalX: mappedX, totalY: mappedY },
    ]
  );
  mapper.startMapping();

  const mapper1 = useMapper(
    function(input, output) {
      'worklet';
      output.totalX.set(input.parentWidth.value - input.totalX.value - 40);
      output.totalY.set(input.totalY.value);
    },
    [
      { totalX: mappedX, totalY: mappedY, parentHeight, parentWidth },
      { totalX: mappedX1, totalY: mappedY1 },
    ]
  );
  mapper1.startMapping();

  const mapper2 = useMapper(
    function(input, output) {
      'worklet';
      output.totalY.set(input.parentHeight.value - input.totalY.value - 40);
      output.totalX.set(input.totalX.value);
    },
    [
      { totalX: mappedX, totalY: mappedY, parentHeight, parentWidth },
      { totalX: mappedX2, totalY: mappedY2 },
    ]
  );
  mapper2.startMapping();

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
      <Animated.View
        style={{
          position: 'absolute',
          width: 40,
          height: 40,
          transform: [
            {
              translateX: mappedX,
            },
            {
              translateY: mappedY,
            },
          ],
          backgroundColor: 'blue',
        }}
      />
      <Animated.View
        style={{
          position: 'absolute',
          width: 40,
          height: 40,
          transform: [
            {
              translateX: mappedX1,
            },
            {
              translateY: mappedY1,
            },
          ],
          backgroundColor: 'red',
        }}
      />
      <Animated.View
        style={{
          position: 'absolute',
          width: 40,
          height: 40,
          transform: [
            {
              translateX: mappedX2,
            },
            {
              translateY: mappedY2,
            },
          ],
          backgroundColor: 'yellow',
        }}
      />
    </View>
  );
}

export default MapperTest2;
