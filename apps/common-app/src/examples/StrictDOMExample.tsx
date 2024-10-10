import React, { useEffect } from 'react';
import { css, html } from 'react-strict-dom';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

const animated = {
  html: {
    div: Animated.createAnimatedComponent(html.div),
  },
};

const styles = css.create({
  container: {
    display: 'flex',
    flexDirection: 'column',
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  box: {
    width: '100px',
    height: '100px',
    backgroundColor: 'blue',
  },
});

export default function StrictDOMExample() {
  const opacity = useSharedValue(1);
  const width = useSharedValue(100);
  const x = useSharedValue(0);
  const y = useSharedValue(0);

  // @ts-expect-error There's a TypeScript bug in `react-native-dom` that
  // doesn't allow React-Native-like `transform`, but it works in runtime.
  // https://github.com/facebook/react-strict-dom/issues/204
  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
      width: width.value,
      transform: [{ translateX: x.value }, { translateY: y.value }],
    };
  }) as css.StyleXStyles;

  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      x.value = e.translationX;
      y.value = e.translationY;
    })
    .onEnd(() => {
      x.value = withSpring(0);
      y.value = withSpring(0);
    });

  useEffect(() => {
    opacity.value = withRepeat(withTiming(0.3, { duration: 800 }), -1, true);
    width.value = withRepeat(withTiming(300, { duration: 800 }), -1, true);
  }, []);

  return (
    <html.div style={styles.container}>
      <html.div>React Strict DOM demo</html.div>
      <GestureDetector gesture={panGesture}>
        {/* Our property types conversion for Animated Components is conflicting
        with Strict DOM's property type conversions in such a way they generate an endless loop. 
        Let's circle back on it in a few years.
        @ts-ignore TODO: */}
        <animated.html.div style={[styles.box, animatedStyle]} />
      </GestureDetector>
    </html.div>
  );
}
