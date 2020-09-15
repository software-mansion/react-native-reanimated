import React from 'react';
import Animated, {
  useAnimatedGestureHandler,
  useAnimatedStyle,
  useSharedValue,
  withDecay,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { View, Dimensions, Platform, StyleSheet } from 'react-native';
import { PanGestureHandler } from 'react-native-gesture-handler';
import { Header } from 'react-navigation-stack';

const windowDimensions = Dimensions.get('window');

const colors = [
  'black',
  'blue',
  'green',
  'yellow',
  'red',
  'gray',
  'pink',
  'orange',
];

const boxHeight = 120;

function friction(value) {
  'worklet';

  const MAX_FRICTION = 200;
  const MAX_VALUE = 400;

  const res = Math.max(
    1,
    Math.min(
      MAX_FRICTION,
      1 + (Math.abs(value) * (MAX_FRICTION - 1)) / MAX_VALUE
    )
  );

  if (value < 0) {
    return -res;
  }

  return res;
}

function ScrollableView({ children }) {
  const translateY = useSharedValue(0);
  const loverBound = useSharedValue(0);

  function onLayout(evt) {
    loverBound.value =
      windowDimensions.height - Header.HEIGHT - evt.nativeEvent.layout.height;
  }

  const handler = useAnimatedGestureHandler({
    onStart: (evt, ctx) => {
      ctx.startY = translateY.value;
    },

    onActive: (evt, ctx) => {
      const nextTranslate = ctx.startY + evt.translationY;

      if (nextTranslate < loverBound.value) {
        translateY.value =
          loverBound.value + friction(nextTranslate - loverBound.value);
      } else if (nextTranslate > 0) {
        translateY.value = friction(nextTranslate);
      } else {
        translateY.value = nextTranslate;
      }
    },

    onEnd: (evt, ctx) => {
      if (translateY.value < loverBound.value || translateY.value > 0) {
        const toValue = translateY.value > 0 ? 0 : loverBound.value;

        translateY.value = withTiming(toValue, {
          duration: 250,
          easing: Easing.bezier(0.25, 0.1, 0.25, 1),
        });
      } else {
        translateY.value = withDecay({
          clamp: [loverBound.value, 0],
          velocity: evt.velocityY,
        });
      }
    },
  });

  const animatedStyles = useAnimatedStyle(() => {
    return {
      height: boxHeight * colors.length,
      transform: [
        {
          translateY: translateY.value,
        },
      ],
    };
  });

  return (
    <View style={{ flex: 1 }}>
      <PanGestureHandler onGestureEvent={handler}>
        <Animated.View style={animatedStyles}>
          <View onLayout={onLayout}>{children}</View>
        </Animated.View>
      </PanGestureHandler>
    </View>
  );
}

function Box({ color }) {
  return (
    <View
      style={{
        backgroundColor: color,
        height: boxHeight,
        borderBottomWidth: 1,
        borderBottomColor: 'gray',
      }}
    />
  );
}

export default function Example() {
  return (
    <View style={styles.wrapper}>
      <ScrollableView>
        {colors.map((color) => (
          <Box color={color} key={color} />
        ))}
      </ScrollableView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    height:
      Platform.OS === 'web'
        ? windowDimensions.height - Header.HEIGHT
        : undefined,
    overflow: Platform.OS === 'web' ? 'hidden' : undefined,
  },
});
