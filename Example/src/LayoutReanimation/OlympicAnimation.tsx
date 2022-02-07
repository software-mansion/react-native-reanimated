import React, { useState } from 'react';
import { Button, View } from 'react-native';
import Animated, { Easing, Keyframe } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

export function OlympicAnimation(): React.ReactElement {
  const [show, setShow] = useState(true);

  const blueRingAnimation = new Keyframe({
    from: {
      opacity: 0,
    },
    to: {
      opacity: 1,
    },
  })
    .delay(600)
    .duration(300);
  const yellowRingAnimation = new Keyframe({
    from: {
      opacity: 0,
    },
    to: {
      opacity: 1,
    },
  })
    .delay(900)
    .duration(300);
  const blackRingAnimation = new Keyframe({
    from: {
      opacity: 0,
    },
    to: {
      opacity: 1,
    },
  })
    .delay(1200)
    .duration(300);

  const greenRingAnimation = new Keyframe({
    from: {
      opacity: 0,
    },
    to: {
      opacity: 1,
    },
  })
    .delay(1500)
    .duration(300);
  const redRingAnimation = new Keyframe({
    from: {
      opacity: 0,
      transform: [{ translateX: -83 }, { translateY: 0 }, { scale: 0 }],
    },
    10: {
      opacity: 1,
      transform: [{ translateX: -83 }, { translateY: 0 }, { scale: 1 }],
      easing: Easing.quad,
    },
    20: {
      transform: [{ translateX: -153 }, { translateY: 0 }],
    },
    30: {
      transform: [{ translateX: -118 }, { translateY: 30 }],
    },
    40: {
      transform: [{ translateX: -83 }, { translateY: 0 }],
    },
    50: {
      transform: [{ translateX: -48 }, { translateY: 30 }],
    },
    60: {
      transform: [{ translateX: -13 }, { translateY: 0 }],
    },
  }).duration(3000);
  const blueRingExitAnimation = new Keyframe({
    from: {
      zIndex: 2,
      opacity: 1,
      transform: [{ translateX: -13 }, { translateY: 0 }, { scale: 1 }],
    },
    10: {
      opacity: 1,
      transform: [{ translateX: 22 }, { translateY: 30 }, { scale: 1 }],
    },
    20: {
      opacity: 1,
      transform: [{ translateX: 57 }, { translateY: 0 }, { scale: 1 }],
    },
    30: {
      opacity: 1,
      transform: [{ translateX: 92 }, { translateY: 30 }, { scale: 1 }],
    },
    40: {
      opacity: 1,
      transform: [{ translateX: 127 }, { translateY: 0 }, { scale: 1 }],
    },
    50: {
      opacity: 1,
      transform: [{ translateX: 57 }, { translateY: 0 }, { scale: 1 }],
    },
    60: {
      opacity: 0,
      transform: [{ translateX: 1100 }, { translateY: 1100 }, { scale: 20 }],
      easing: Easing.quad,
    },
  }).duration(3000);
  const yellowRingExitAnimation = new Keyframe({
    from: {
      opacity: 1,
    },
    to: {
      opacity: 0,
      easing: Easing.out(Easing.exp),
    },
  })
    .delay(200)
    .duration(100);
  const blackRingExitAnimation = new Keyframe({
    from: {
      opacity: 1,
    },
    to: {
      opacity: 0,
      easing: Easing.out(Easing.exp),
    },
  })
    .delay(500)
    .duration(100);
  const greenRingExitAnimation = new Keyframe({
    from: {
      opacity: 1,
    },
    to: {
      opacity: 0,
      easing: Easing.out(Easing.exp),
    },
  })
    .delay(800)
    .duration(100);
  const redRingExitAnimation = new Keyframe({
    from: {
      opacity: 1,
    },
    to: {
      opacity: 0,
      easing: Easing.out(Easing.exp),
    },
  })
    .delay(1100)
    .duration(100);

  return (
    <>
      <Button title="show" onPress={() => setShow((prev) => !prev)} />
      {show && (
        <View>
          <Animated.View
            entering={blueRingAnimation}
            exiting={blueRingExitAnimation}
            style={{ transform: [{ translateX: -13 }] }}>
            <Svg width={500} height={500}>
              <Path
                fill="none"
                stroke="#2A5AA6"
                strokeWidth={5}
                strokeMiterlimit={10}
                d="M106.9 180.7c6.3-14.9 23.4-21.9 38.3-15.6 14.9 6.3 21.9 23.4 15.6 38.3-6.3 14.9-23.4 21.9-38.3 15.6-10.8-4.6-17.9-15.2-17.9-26.9 0-3.9.8-7.8 2.3-11.4"
              />
            </Svg>
          </Animated.View>
          <Animated.View
            entering={yellowRingAnimation}
            exiting={yellowRingExitAnimation}
            style={{ position: 'absolute', transform: [{ translateX: -13 }] }}>
            <Svg width={500} height={500}>
              <Path
                fill="none"
                stroke="#F08A1A"
                strokeWidth={5}
                strokeMiterlimit={10}
                d="M168.8 250.6c-16.1 0-29.2-13.1-29.2-29.2s13.1-29.2 29.2-29.2 29.2 13.1 29.2 29.2c.1 16.1-13 29.2-29.2 29.2"
              />
            </Svg>
          </Animated.View>
          <Animated.View
            entering={blackRingAnimation}
            exiting={blackRingExitAnimation}
            style={{ position: 'absolute', transform: [{ translateX: -13 }] }}>
            <Svg width={500} height={500}>
              <Path
                fill="none"
                stroke="#000000"
                strokeWidth={5}
                strokeMiterlimit={10}
                d="M174.9 182.9c5-15.4 21.5-23.8 36.9-18.8 15.4 5 23.8 21.5 18.8 36.9-5 15.4-21.5 23.8-36.9 18.8-12-3.9-20.2-15.1-20.2-27.7-.1-3.1.4-6.2 1.4-9.2"
              />
            </Svg>
          </Animated.View>
          <Animated.View
            entering={greenRingAnimation}
            exiting={greenRingExitAnimation}
            style={{ position: 'absolute', transform: [{ translateX: -13 }] }}>
            <Svg width={500} height={500}>
              <Path
                fill="none"
                stroke="#18A138"
                strokeWidth={5}
                strokeMiterlimit={10}
                d="M243.5 250c-15.8 3.3-31.3-6.9-34.5-22.7-3.3-15.8 6.9-31.3 22.7-34.5 15.8-3.3 31.3 6.9 34.5 22.7.4 1.9.6 3.9.6 5.9 0 13.8-9.7 25.8-23.3 28.6"
              />
            </Svg>
          </Animated.View>
          <Animated.View
            entering={redRingAnimation}
            exiting={redRingExitAnimation}
            style={{ position: 'absolute' }}>
            <Svg width={500} height={500}>
              <Path
                fill="none"
                stroke="#E53B22"
                strokeWidth={5}
                strokeMiterlimit={10}
                d="M285.6 217.7c-14.1 7.9-31.9 2.8-39.8-11.3-7.9-14.1-2.8-31.9 11.3-39.8 14.1-7.9 31.9-2.8 39.8 11.3 2.4 4.3 3.7 9.2 3.7 14.2 0 10.6-5.7 20.4-15 25.6"
              />
            </Svg>
          </Animated.View>
        </View>
      )}
    </>
  );
}
