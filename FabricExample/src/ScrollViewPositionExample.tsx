import React, { useEffect } from 'react';

import Animated, {
  useScrollViewPosition,
  useAnimatedStyle,
  useAnimatedRef,
  useEvent,
  event,
} from 'react-native-reanimated';
import { StyleSheet, Text, View } from 'react-native';

export default function ScrollViewPositionExample() {
  const aref = useAnimatedRef<Animated.ScrollView>();
  // const scrollHandler = useScrollViewPosition(aref);

  // useAnimatedStyle(() => {
  //   console.log(scrollHandler.offset.value);
  //   return {};
  // });

  const event = useEvent(
    (event) => {
      'worklet';
      console.log("onScroll recieved:", event.contentOffset.y);
    },
    ['onScroll']
  )

  useEffect(() => {
    // console.log(aref.current)
  });

  return (
    <>
      <View style={styles.positionView}>
        <Text>Test</Text>
      </View>
      <View style={styles.divider} />
      <Animated.ScrollView
        ref={aref}
        scrollEventThrottle={16}
        onScroll={
          // () => {
          //   console.log('test1');
          // }
          useEvent((event) => {
            'worklet';
            console.log('test2');
          }, [])
        }
        style={styles.scrollView} >
          {[...Array(100)].map((_, i) => (
            <Text key={i} style={styles.text}>
              {i}
            </Text>
          ))}
      </Animated.ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  positionView: {
    margin: 20,
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
    width: '100%',
  },
  text: {
    fontSize: 50,
    textAlign: 'center',
  },
  divider: {
    backgroundColor: 'black',
    height: 1,
  },
});
