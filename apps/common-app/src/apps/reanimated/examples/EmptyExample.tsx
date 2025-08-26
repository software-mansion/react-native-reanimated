import React, { useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedRef,
  useAnimatedReaction,
  useScrollOffset,
  useSharedValue,
} from 'react-native-reanimated';

export default function EmptyExample() {
  const aref = useAnimatedRef();
  const ref = useRef(null);
  const sv = useSharedValue(0);

  // const offset = useScrollOffset(ref);

  useAnimatedReaction(
    () => sv.value,
    (value) => {
      console.log(value);
    }
  );

  return (
    <Animated.ScrollView
      ref={ref}
      contentContainerStyle={styles.content}
      scrollViewOffset={sv}>
      <View style={styles.box} />
      <View style={styles.box} />
      <View style={styles.box} />
      <View style={styles.box} />
      <View style={styles.box} />
      <View style={styles.box} />
      <View style={styles.box} />
      <View style={styles.box} />
      <View style={styles.box} />
      <View style={styles.box} />
    </Animated.ScrollView>
  );
}

const styles = StyleSheet.create({
  box: {
    width: 100,
    height: 100,
    backgroundColor: 'red',
  },
  content: {
    gap: 10,
    padding: 10,
  },
});
