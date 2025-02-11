import React from 'react';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { StyleSheet, Text, View } from 'react-native';
import type { EventHandlerProcessed } from 'react-native-reanimated';
import Animated, {
  interpolateColor,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useComposedEventHandler,
  useSharedValue,
} from 'react-native-reanimated';

export default function ComposedHandlerInternalMergingExample() {
  const sv = useSharedValue(0);

  const onScrollHandler = useAnimatedScrollHandler({
    onScroll(e) {
      'worklet';
      sv.value = sv.value + 1;
      console.log(`scroll handler: ${e.eventName} ${sv.value}`);
    },
  });

  return (
    <View style={styles.container}>
      <Text style={styles.infoText}>Check console logs!</Text>
      <ColorChangingList additionalHandler={onScrollHandler} />
    </View>
  );
}

const ColorChangingList = ({
  additionalHandler,
}: {
  additionalHandler: EventHandlerProcessed<
    NativeSyntheticEvent<NativeScrollEvent>
  >;
}) => {
  const offsetSv = useSharedValue(0);

  const internalHandler = useAnimatedScrollHandler({
    onScroll(e) {
      const scaledValue = e.contentOffset.y % 600;
      offsetSv.value = scaledValue <= 300 ? scaledValue : 600 - scaledValue;
    },
  });

  const animatedStyle = useAnimatedStyle(() => {
    return {
      backgroundColor: interpolateColor(
        offsetSv.value,
        [0, 300],
        ['blue', 'purple']
      ),
    };
  });

  const composedHandler = useComposedEventHandler([
    internalHandler,
    additionalHandler,
  ]);

  return (
    <Animated.ScrollView
      onScroll={composedHandler}
      style={[styles.list, animatedStyle]}>
      {[...Array(100)].map((_, num: number) => (
        <View key={`${num}`} style={styles.item}>
          <Text>{`${num}`}</Text>
        </View>
      ))}
    </Animated.ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column',
  },
  infoText: {
    fontSize: 19,
    alignSelf: 'center',
  },
  list: {
    flex: 1,
  },
  item: {
    backgroundColor: 'white',
    alignItems: 'center',
    padding: 20,
    marginVertical: 8,
    marginHorizontal: 16,
    borderRadius: 20,
  },
});
