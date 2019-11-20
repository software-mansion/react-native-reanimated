import React, { useMemo, useEffect } from 'react';
import { findNodeHandle, Image, StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';


const { interpolate, cond, eq, add, call, set, Value, event, concat, sub, color, invoke, dispatch, useCode, or, Code, callback, neq, createAnimatedComponent, View, ScrollView, and, proc, Clock, multiply, onChange, not, defined, clockRunning, block, startClock, stopClock, spring } = Animated;

const scrollTo = proc((scrollX, scrollY, animated) => dispatch('RCTScrollView', 'scrollTo', scrollX, scrollY, animated));

export default function SyncedScrollViews() {
  //const [handleA, setHandleA] = React.useState();
  //const [handleB, setHandleB] = React.useState();
  const scrollX = useMemo(() => new Value(0), []);
  const scrollY = useMemo(() => new Value(0), []);

  const scrollToA = useMemo(() => dispatch('RCTScrollView', 'scrollTo', scrollX, scrollY, 0), [scrollX, scrollY]);
  const scrollToB = useMemo(() => dispatch('RCTScrollView', 'scrollTo', scrollX, scrollY, 0), [scrollX, scrollY]);

  const onScroll = useMemo(() => event([{ nativeEvent: { contentOffset: { x: scrollX, y: scrollY } } }]), [scrollX, scrollY]);

  //const otherScrollY = useMemo(() => new Value(0), []);
  //const otherOnScroll = useMemo(() => event([{ nativeEvent: { contentOffset: { y: otherScrollY } } }]), [otherScrollY]);

  useCode(() =>
    block([
      scrollToA,
      scrollToB
    ]),
    [scrollToA, scrollToB]
  );

  const baseScrollComponent = (
    <ScrollView
      style={styles.scrollView}
      collapsable={false}
      onScroll={onScroll}
      scrollEventThrottle={1}
    >
      <Image source={require('../imageViewer/grid.png')} collapsable={false} />
    </ScrollView>
  );

  return (
    <>
      {React.cloneElement(baseScrollComponent, { ref: (ref) => scrollToA.setNativeView(ref) })}
      {React.cloneElement(baseScrollComponent, { ref: (ref) => scrollToB.setNativeView(ref) })}
    </>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    borderColor: 'blue',
    borderWidth: 2,
    margin: 5
  },
  default: {
    flex: 1,
  }
})