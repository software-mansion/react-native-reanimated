import Animated, {
  AnimatedScrollViewProps,
  useAnimatedScrollHandler,
} from 'react-native-reanimated';
import { StyleSheet, Text } from 'react-native';

import React from 'react';
import { useComposedScrollHandler } from '../../../../src/reanimated2/hook/composeAnimatedScrollHandler';

export default function ComposedAnimatedScrollHandlerExample() {
  const externalScrollHandler = useAnimatedScrollHandler((event) => {
    console.log('External handler', event.contentOffset.y);
  });

  return (
    <CustomScrollView
      onScroll={externalScrollHandler}
      style={styles.scrollView}>
      {[...Array(100)].map((_, i) => (
        <Text key={i} style={styles.text}>
          {i}
        </Text>
      ))}
    </CustomScrollView>
  );
}

function CustomScrollView(props: AnimatedScrollViewProps) {
  const scrollHandler = useAnimatedScrollHandler((event) => {
    console.log('Internal handler', event.contentOffset.y);
  });

  const composedScrollHandler = useComposedScrollHandler([
    scrollHandler,
    props.onScroll, // <- I don't know how to correctly type this
  ]);

  return (
    <Animated.ScrollView {...props} onScroll={composedScrollHandler}>
      {props.children}
    </Animated.ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    width: '100%',
  },
  text: {
    fontSize: 50,
    textAlign: 'center',
  },
});
