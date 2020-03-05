import React, { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { TextInput } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';

const { Value, event, dispatch, useCode, createAnimatedComponent, block, cond, not, and, divide, acc, eq, set, View, or, debug, add, call } = Animated;

const AnimatedTextInput = createAnimatedComponent(TextInput);

export default function SyncedScrollViews() {
  const isFocussed = useMemo(() => new Value(0), []);
  const scroller = useMemo(() => new Value(0), []);

  const onFocus = useMemo(() =>
    event([{
      nativeEvent: () => set(isFocussed, 1)
      //nativeEvent: () => set(isFocussed, 1)
    }]),
    [isFocussed]
  );

  const onBlur = useMemo(() =>
    event([{
      nativeEvent: () => set(isFocussed, 0)
    }]),
    [isFocussed]
  );

  const onScroll = useMemo(() =>
    event([{
      nativeEvent: () => set(scroller, 1)
    }]),
    [scroller]
  );

  useCode(() =>
    call([isFocussed], ([what]) => console.log(what === 1 ? 'focus' : 'blur')),
    [isFocussed]
  );

  useCode(() =>
    call([scroller], ([what]) => console.log(what === 1 ? 'scrolling' : 'no sure about scrolling')),
    [scroller]
  );

  return (
    <Animated.ScrollView
      onScroll={onScroll}
    >
      <AnimatedTextInput
        style={styles.default}
        onFocus={onFocus}
        onBlur={onBlur}
        placeholder="press me"
      />
      <View style={{ height: 2000, flex: 1, backgroundColor: 'lightblue' }} />
    </Animated.ScrollView>
  );
}

const styles = StyleSheet.create({
  default: {
    flex: 1,
  }
})