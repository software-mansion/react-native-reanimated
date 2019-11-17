import React, { useMemo, useCallback } from 'react';
import { findNodeHandle, Image, StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';


const { interpolate, cond, eq, add, call, set, Value, event, concat, sub, color, invoke, dispatch, useCode, or, Code, callback, neq, createAnimatedComponent, View, ScrollView, and, proc, Clock, multiply, onChange, not, defined, clockRunning, block, startClock, stopClock, spring } = Animated;

const scrollTo = proc((tag, scrollX, scrollY, animated) => cond(defined(tag, -1), dispatch('RCTScrollView', 'scrollTo', tag, scrollX, scrollY, animated)));

export default function SyncedScrollViews() {
  //const ref = React.useRef();
  const [handleA, setHandleA] = React.useState();
  const [handleB, setHandleB] = React.useState();
  const scrollX = useMemo(() => new Value(0), []);
  const scrollY = useMemo(() => new Value(0), []);


  const onScroll = useMemo(() => event([{ nativeEvent: { contentOffset: { x: scrollX, y: scrollY } } }]), [scrollX, scrollY]);

  //const otherScrollY = useMemo(() => new Value(0), []);
  //const otherOnScroll = useMemo(() => event([{ nativeEvent: { contentOffset: { y: otherScrollY } } }]), [otherScrollY]);

  useCode(() =>
    block([
      scrollTo(handleA, scrollX, scrollY, 0),
      scrollTo(handleB, scrollX, scrollY, 0)
    ]),
    [handleA, handleB, scrollX, scrollY]
  );

  const __scrollX = useMemo(() => new Value(0), []);
  const __scrollY = useMemo(() => new Value(0), []);
  const attachedEvent = useMemo(() => event([{ nativeEvent: { contentOffset: { x: __scrollX, y: __scrollY } } }]), [scrollX, scrollY]);

  useCode(() =>
    call([__scrollX, __scrollY], v => console.log('logging second attached event values', v)),
    [__scrollX, __scrollY]
  );

  const onScrollFunc = useCallback((e) =>
    console.log('logging additional `onScroll` function prop', e.nativeEvent.contentOffset),
    []
  );

  const baseScrollComponent = (
    <ScrollView
      style={styles.scrollView}
      collapsable={false}
      onScroll={[onScroll, onScrollFunc, attachedEvent]}
      scrollEventThrottle={1}
      momentumScrollEnabled={false}
    >
      <Image source={require('../imageViewer/grid.png')} collapsable={false} />
    </ScrollView>
  );

  return (
    <>
      {React.cloneElement(baseScrollComponent, { ref: (ref) => setHandleA(findNodeHandle(ref)) })}
      {React.cloneElement(baseScrollComponent, { ref: (ref) => setHandleB(findNodeHandle(ref)) })}
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