import { colors, radius, sizes } from '@/theme';
import React, { useEffect, useRef, useState } from 'react';
import { Button, StyleSheet, Text, View } from 'react-native';
import Animated, {
  css,
  FadeInLeft,
  FadeOutRight,
  LayoutAnimationConfig,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

// const animation = {
//   animationDelay: '1s',
//   animationDuration: '2s',
//   animationFillMode: 'backwards',
//   animationName: {
//     from: {
//       left: 10,
//     },
//     to: {
//       left: 100,
//     },
//   },
// };

// export default function EmptyExample() {
//   const [state, setState] = React.useState(50);
//   const [opacity, setOpacity] = React.useState(0);
//   const sv = useSharedValue(100);
//   const opacitySv = useSharedValue(0);
//   const [isAnimating, setIsAnimating] = React.useState(true);
//   const [height, setHeight] = React.useState(100);
//   const animatedStyle = useAnimatedStyle(() => {
//     return {
//       opacity: opacitySv.value,
//       width: sv.value,
//     };
//   });

//   useEffect(() => {
//     sv.value = withTiming(300, { duration: 2000 });
//     opacitySv.value = withTiming(1, { duration: 2000 });
//   }, [sv, opacitySv]);

//   const style = isAnimating
//     ? [
//         {
//           width: 100,
//           height: height,
//           backgroundColor: 'black',
//           opacity: opacity,
//         },
//         animatedStyle,
//       ]
//     : {
//         width: 100,
//         height: height,
//         backgroundColor: 'black',
//         opacity: opacity,
//       };
//   return (
//     <View style={styles.container}>
//       {/* <Button title="Change height" onPress={() => setState(state + 10)} /> */}
//       <Button title="Change height" onPress={() => setHeight(height + 10)} />
//       <Button
//         title="Toggle animation"
//         onPress={() => setIsAnimating(!isAnimating)}
//       />
//       <Button
//         title="Change opacity"
//         onPress={() => setOpacity(opacity + 0.1)}
//       />
//       {/* <View style={styles.wrapper}>
//         <Animated.View style={[styles.box, { height: state }, animation]} />
//       </View> */}
//       <Animated.View style={style} />
//     </View>
//   );
// }

const ANIMATION_DURATION = 1500;

const roll = css.keyframes({
  to: {
    transform: [{ rotate: '360deg' }],
  },
});

const color = css.keyframes({
  '50%': {
    backgroundColor: colors.primaryDark,
  },
});

const fade = css.keyframes({
  '50%': {
    opacity: 0,
  },
});

const animations = [
  { animation: roll, name: 'Roll' },
  { animation: color, name: 'Color' },
  { animation: fade, name: 'Fade' },
];

export default function Showcase() {
  const [animationIndex, setAnimationIndex] = useState(0);

  const { animation, name: animationName } = animations[animationIndex];

  const [isFocused, setIsFocused] = useState(true);
  const lastIterationStartTimestampRef = useRef(0);
  const lastIterationElapsedTimeRef = useRef(0);

  useEffect(() => {
    if (isFocused) {
      // This timeout/interval logic ensures that the animation will be always changed
      // after 2 iterations, even if the user left the screen during the iteration and
      // came back later (the animation will be resumed at the same point as it was
      // stopped and changed until the second iteration completes)
      let interval: NodeJS.Timeout;
      let timeout: NodeJS.Timeout;

      const changeAnimation = () => {
        console.log('Changing animation');
        setAnimationIndex((prev) => (prev + 1) % animations.length);
      };

      const startInterval = () => {
        interval = setInterval(() => {
          lastIterationStartTimestampRef.current = Date.now();
          changeAnimation();
        }, 2 * ANIMATION_DURATION);
      };

      if (lastIterationElapsedTimeRef.current > 0) {
        // console.log(
        //   'timeout',
        //   ANIMATION_DURATION - lastIterationElapsedTimeRef.current
        // );
        timeout = setTimeout(() => {
          changeAnimation();
          startInterval();
        }, ANIMATION_DURATION - lastIterationElapsedTimeRef.current);
      } else {
        startInterval();
      }

      return () => {
        clearInterval(interval);
        clearTimeout(timeout);
      };
    }
    lastIterationElapsedTimeRef.current =
      Date.now() - lastIterationStartTimestampRef.current;
  }, [isFocused]);

  return (
    <View style={styles.container}>
      <Button
        title="Toggle Focus"
        onPress={() => setIsFocused((prev) => !prev)}
      />
      <Animated.View
        style={[
          styles.cssBox,
          {
            animationName: animation,
            animationPlayState: isFocused ? 'running' : 'paused',
          },
        ]}
      />
      <LayoutAnimationConfig skipEntering skipExiting>
        <Animated.View
          entering={FadeInLeft}
          exiting={FadeOutRight}
          key={animationName}>
          <Text>{animationName}</Text>
        </Animated.View>
      </LayoutAnimationConfig>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  box: {
    backgroundColor: 'red',
    borderRadius: radius.sm,
    height: sizes.sm,
    width: sizes.sm,
    left: -80,
  },
  cssBox: {
    animationDuration: ANIMATION_DURATION,
    animationIterationCount: 'infinite',
    animationTimingFunction: 'ease-in-out',
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    height: sizes.md,
    width: sizes.md,
  },
  wrapper: {
    backgroundColor: 'blue',
    borderRadius: radius.sm,
    width: 200,
  },
});
