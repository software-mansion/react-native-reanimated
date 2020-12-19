import React from 'react';
import { View } from 'react-native';
import Animated, {
  useSharedValue,
  withSpring,
  useAnimatedStyle,
  useAnimatedGestureHandler,
  interpolate,
} from 'react-native-reanimated';
import { PanGestureHandler } from 'react-native-gesture-handler';

function DragAndSnap() {
  const translation = {
    x: useSharedValue(0),
    y: useSharedValue(0),
  };

  const gestureHandler = useAnimatedGestureHandler({
    onStart: (_, ctx) => {
      ctx.startX = translation.x.value;
      ctx.startY = translation.y.value;
    },
    onActive: (event, ctx) => {
      translation.x.value = ctx.startX + event.translationX;
      translation.y.value = ctx.startY + event.translationY;
    },
    onEnd: (_) => {
      translation.x.value = withSpring(0);
      translation.y.value = withSpring(0);
    },
  });

  const stylez = useAnimatedStyle(() => {
    const S = Math.round(
      interpolate(translation.y.value, [0, 100], [50, 100], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'extend',
      })
    );

    // console.log("VALUE IS", translation.y.value);

    // const S = Math.round(
    //   interpolate(translation.y.value, [0, 100], [50, 100], 'clamp')
    // );

    const backgroundColor = `hsl(${S},${S}%,50%)`;
    return {
      transform: [
        {
          translateX: translation.x.value,
        },
        {
          translateY: translation.y.value,
        },
      ],
      width: S * 2,
      backgroundColor,
    };
  });

  return (
    <View style={{ flex: 1, margin: 50 }}>
      <PanGestureHandler onGestureEvent={gestureHandler}>
        <Animated.View
          style={[
            {
              top: 200,
              width: 40,
              height: 40,
            },
            stylez,
          ]}
        />
      </PanGestureHandler>
    </View>
  );
}

export default DragAndSnap;
