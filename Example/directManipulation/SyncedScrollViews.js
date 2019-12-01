import React, { useMemo, useRef } from 'react';
import { Image, StyleSheet, ScrollView as RNScrollView } from 'react-native';
import Animated from 'react-native-reanimated';
import { State, NativeViewGestureHandler, PanGestureHandler } from 'react-native-gesture-handler';

const { Value, event, dispatch, useCode, createAnimatedComponent, block, cond, not, and, eq, set, View, or, debug } = Animated;
const ScrollView = createAnimatedComponent(RNScrollView);

export default function SyncedScrollViews() {
  //const [handleA, setHandleA] = React.useState();
  //const [handleB, setHandleB] = React.useState();
  const scrollX = useMemo(() => new Value(0), []);
  const scrollY = useMemo(() => new Value(0), []);
  const stateA = useMemo(() => new Value(State.UNDETERMINED), []);
  const stateB = useMemo(() => new Value(State.UNDETERMINED), []);
  const state = useMemo(() => debug('scroll state', new Value(0)), []);

  const scrollToA = useMemo(() => dispatch('RCTScrollView', 'scrollTo', scrollX, scrollY, 0), [scrollX, scrollY]);
  const scrollToB = useMemo(() => dispatch('RCTScrollView', 'scrollTo', scrollX, scrollY, 0), [scrollX, scrollY]);

  const panRef = useRef();
  const scrollARef = useRef();
  const scrollBRef = useRef();

  const beginDragA = useMemo(() =>
    event([{
      nativeEvent: ({ contentOffset: { x, y } }) => block([
        set(state, 1),
        set(scrollX, x),
        set(scrollY, y)
      ])
    }]),
    [state]
  );

  const beginDragB = useMemo(() =>
    event([{
      nativeEvent: ({ contentOffset: { x, y } }) => block([
        set(state, 2),
        set(scrollX, x),
        set(scrollY, y)
      ])
    }]),
    [state]
  );

  const onScrollA = useMemo(() =>
    event([{
      nativeEvent: ({ contentOffset: { x, y } }) =>
        cond(
          or(eq(state, 1), eq(state, 0)),
          [
            set(scrollX, x),
            set(scrollY, y)
          ]
        )
    }]),
    [state]
  );

  const onScrollB = useMemo(() =>
    event([{
      nativeEvent: ({ contentOffset: { x, y } }) =>
        cond(
          or(eq(state, 2), eq(state, 0)),
          [
            set(scrollX, x),
            set(scrollY, y),
          ]
        )
    }]),
    [state]
  );

  // const otherScrollY = useMemo(() => new Value(0), []);
  // const otherOnScroll = useMemo(() => event([{ nativeEvent: { contentOffset: { y: otherScrollY } } }]), [otherScrollY]);

  useCode(() =>
    block([
      scrollToA,
      scrollToB,
    ]),
    [scrollToA, scrollToB]
  );

  const baseScrollComponent = (
    <ScrollView
      style={styles.scrollView}
      collapsable={false}
      scrollEventThrottle={1}
      simultaneousHandlers={panRef}
      disableScrollViewPanResponder
      decelerationRate='normal'
    >
      <Image source={require('../imageViewer/grid.png')} collapsable={false} />
    </ScrollView>
  );

  return (
    <PanGestureHandler
      ref={panRef}
      simultaneousHandlers={[scrollARef, scrollBRef]}
      enabled={false}
    >
      <View style={styles.default} collapsable={false}>
        {React.cloneElement(baseScrollComponent, {
          ref: (ref) => {
            scrollToA.setNativeView(ref);
            scrollARef.current = ref;
          },
          onScroll: onScrollA,
          onScrollBeginDrag: beginDragA,
          onMomentumScrollBegin: beginDragA,
          onMomentumScrollEnd: onScrollA
        })}
        {React.cloneElement(baseScrollComponent, {
          ref: (ref) => {
            scrollToB.setNativeView(ref);
            scrollBRef.current = ref;
          },
          onScroll: onScrollB,
          onScrollBeginDrag: beginDragB,
          onMomentumScrollBegin: beginDragB,
          onMomentumScrollEnd: onScrollB
        })}
      </View>
    </PanGestureHandler>
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