import React from 'react';
import { View, Dimensions, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedGestureHandler,
  useDerivedValue,
  withSpring,
  clamp,
} from 'react-native-reanimated';
import {
  PanGestureHandler,
  PanGestureHandlerGestureEvent,
} from 'react-native-gesture-handler';

const { width: windowWidth, height: windowHeight } = Dimensions.get('window');

function ChatHeads({
  children,
}: React.PropsWithChildren<Record<never, never>>) {
  const transX = useSharedValue(0);
  const transY = useSharedValue(0);

  type AnimatedGHContext = {
    startX: number;
    startY: number;
  };
  const gestureHandler = useAnimatedGestureHandler<
    PanGestureHandlerGestureEvent,
    AnimatedGHContext
  >({
    onStart: (_, ctx) => {
      ctx.startX = transX.value;
      ctx.startY = transY.value;
    },
    onActive: (event, ctx) => {
      transX.value = ctx.startX + event.translationX;
      transY.value = ctx.startY + event.translationY;
    },
    onEnd: (event) => {
      const width = windowWidth - 100 - 40; // minus margins & width
      const height = windowHeight - 100 - 40; // minus margins & height
      const toss = 0.2;
      const targetX = clamp(transX.value + toss * event.velocityX, 0, width);
      const targetY = clamp(transY.value + toss * event.velocityY, 0, height);
      // return;

      const top = targetY;
      const bottom = height - targetY;
      const left = targetX;
      const right = width - targetX;
      const minDistance = Math.min(top, bottom, left, right);
      let snapX = targetX;
      let snapY = targetY;
      switch (minDistance) {
        case top:
          snapY = 0;
          break;
        case bottom:
          snapY = height;
          break;
        case left:
          snapX = 0;
          break;
        case right:
          snapX = width;
          break;
      }
      transX.value = withSpring(snapX, {
        velocity: event.velocityX,
      });
      transY.value = withSpring(snapY, {
        velocity: event.velocityY,
      });
    },
  });

  const stylez = useAnimatedStyle(() => {
    return {
      transform: [
        {
          translateX: transX.value,
        },
        {
          translateY: transY.value,
        },
      ],
    };
  });

  const childrenArray = React.Children.toArray(children);

  return (
    <>
      {childrenArray.length > 1 && (
        <Followers
          children={childrenArray.slice(1)}
          transX={transX}
          transY={transY}
        />
      )}
      <PanGestureHandler onGestureEvent={gestureHandler}>
        <Animated.View style={[styles.headContainer, stylez]}>
          {childrenArray[0]}
        </Animated.View>
      </PanGestureHandler>
    </>
  );
}

type FollowersProps = {
  readonly transX: Animated.SharedValue<number>;
  readonly transY: Animated.SharedValue<number>;
};
function Followers({
  transX,
  transY,
  children,
}: React.PropsWithChildren<FollowersProps>) {
  const myTransX = useDerivedValue(() => {
    return withSpring(transX.value);
  });
  const myTransY = useDerivedValue(() => {
    return withSpring(transY.value);
  });

  const stylez = useAnimatedStyle(() => {
    return {
      transform: [
        {
          translateX: myTransX.value,
        },
        {
          translateY: myTransY.value,
        },
      ],
    };
  });

  const childrenArray = React.Children.toArray(children);

  return (
    <>
      {childrenArray.length > 1 && (
        <Followers
          children={childrenArray.slice(1)}
          transX={myTransX}
          transY={myTransY}
        />
      )}
      <Animated.View style={[styles.headContainer, stylez]}>
        {childrenArray[0]}
      </Animated.View>
    </>
  );
}

export default function ChatHeadsExample() {
  return (
    <View style={styles.container}>
      <ChatHeads>
        <View style={[styles.head, styles.black]} />
        <View style={[styles.head, styles.blue]} />
        <View style={[styles.head, styles.green]} />
        <View style={[styles.head, styles.yellow]} />
      </ChatHeads>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    margin: 50,
  },
  head: {
    width: 40,
    height: 40,
  },
  headContainer: {
    position: 'absolute',
  },
  black: { backgroundColor: 'black' },
  blue: { backgroundColor: 'blue' },
  green: { backgroundColor: 'green' },
  yellow: { backgroundColor: 'yellow' },
});
