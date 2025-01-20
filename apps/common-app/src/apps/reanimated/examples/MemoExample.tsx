import React, { memo } from 'react';
import { View, StyleSheet, Button } from 'react-native';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
} from 'react-native-reanimated';
import type {
  AnimatedStyle,
  EventHandlerProcessed,
} from 'react-native-reanimated';

const MemoizedComponent = memo<{
  scrollHandler: EventHandlerProcessed<NativeSyntheticEvent<NativeScrollEvent>>;
  animatedBoxStyle: AnimatedStyle;
}>(({ scrollHandler, animatedBoxStyle }) => (
  <>
    <Animated.View style={[styles.box, animatedBoxStyle]} />
    <Animated.ScrollView
      onScroll={scrollHandler}
      horizontal={true}
      style={styles.list}>
      {[...Array(10).keys()].map((i: number) => (
        <View
          key={i}
          style={[
            styles.element,
            {
              backgroundColor: `hsl(${i * 10}, 50%, 50%)`,
            },
          ]}
        />
      ))}
    </Animated.ScrollView>
  </>
));

export default function App() {
  const [counter, setCounter] = React.useState(0);

  const width = useSharedValue(100);
  const backgroundColor = useSharedValue('hsl(0, 50%, 50%)');
  const scrollHandler = useAnimatedScrollHandler((event) => {
    console.log(counter);
    width.value = 100 + event.contentOffset.x / 5;
    backgroundColor.value = `hsl(${event.contentOffset.x / 10}, 50%, 50%)`;
  });
  const animatedBoxStyle = useAnimatedStyle(() => ({
    width: width.value,
    backgroundColor: backgroundColor.value,
  }));

  return (
    <View style={styles.container}>
      <MemoizedComponent
        scrollHandler={scrollHandler}
        animatedBoxStyle={animatedBoxStyle}
      />
      <Button title="Re-render" onPress={() => setCounter((s) => s + 1)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: 'white',
  },
  list: {
    maxHeight: 120,
  },
  box: {
    height: 100,
    backgroundColor: 'red',
    alignSelf: 'center',
    margin: 30,
  },
  element: {
    width: 100,
    height: 100,
    margin: 10,
  },
});
