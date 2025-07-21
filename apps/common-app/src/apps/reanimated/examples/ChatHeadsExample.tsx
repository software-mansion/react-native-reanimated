import React from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  clamp,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

const { width: windowWidth, height: windowHeight } = Dimensions.get('window');

function ChatHeads({
  children,
}: React.PropsWithChildren<Record<never, never>>) {
  const transX = useSharedValue(0);
  const transY = useSharedValue(0);
  const startPosition = useSharedValue({ x: 0, y: 0 });

  const gesture = Gesture.Pan()
    .onStart(() => {
      startPosition.value = { x: transX.value, y: transY.value };
    })
    .onUpdate((event) => {
      transX.value = startPosition.value.x + event.translationX;
      transY.value = startPosition.value.y + event.translationY;
    })
    .onEnd((event) => {
      const width = windowWidth - 100 - 40;
      const height = windowHeight - 100 - 40 - 128;
      const toss = 0.2;

      const targetX = clamp(transX.value + toss * event.velocityX, 0, width);
      const targetY = clamp(transY.value + toss * event.velocityY, 0, height);

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

      transX.value = withSpring(snapX, { velocity: event.velocityX });
      transY.value = withSpring(snapY, { velocity: event.velocityY });
    });

  const stylez = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: transX.value }, { translateY: transY.value }],
    };
  });

  const childrenArray = React.Children.toArray(children);

  return (
    <>
      {childrenArray.length > 1 && (
        <Followers transX={transX} transY={transY}>
          {childrenArray.slice(1)}
        </Followers>
      )}
      <GestureDetector gesture={gesture}>
        <Animated.View style={[styles.headContainer, stylez]}>
          {childrenArray[0]}
        </Animated.View>
      </GestureDetector>
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
        { translateX: myTransX.value },
        { translateY: myTransY.value },
      ],
    };
  });

  const childrenArray = React.Children.toArray(children);

  return (
    <>
      {childrenArray.length > 1 && (
        <Followers
          // eslint-disable-next-line react/no-children-prop
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
