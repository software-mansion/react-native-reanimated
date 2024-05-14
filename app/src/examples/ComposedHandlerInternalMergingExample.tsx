import React from 'react';
import { Text, View, StyleSheet } from 'react-native';
import Animated, {
  EventHandlerProcessed,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useComposedEventHandler,
  useSharedValue,
  RNNativeScrollEvent,
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
  additionalHandler: EventHandlerProcessed<RNNativeScrollEvent>;
}) => {
  const offsetSv = useSharedValue(0);

  const internalHandler = useAnimatedScrollHandler({
    onScroll(e) {
      const scaledValue = e.contentOffset.y % 600;
      offsetSv.value =
        scaledValue <= 300
          ? (scaledValue / 600) * 255
          : ((600 - scaledValue) / 600) * 255;
    },
  });

  const animatedStyle = useAnimatedStyle(() => {
    return {
      backgroundColor: `rgb(${offsetSv.value},30,${255 - offsetSv.value})`,
    };
  });

  const composedHandler = useComposedEventHandler([
    internalHandler,
    additionalHandler,
  ]);

  return (
    <Animated.FlatList
      onScroll={composedHandler}
      style={[styles.list, animatedStyle]}
      data={items}
      renderItem={({ item }) => <Item title={item.title} />}
      keyExtractor={(item) => `A:${item.title}`}
    />
  );
};

type ItemProps = { title: string };
const Item = ({ title }: ItemProps) => (
  <View style={styles.item}>
    <Text style={styles.title}>{title}</Text>
  </View>
);

type ItemValue = { title: string };
const items: ItemValue[] = [...new Array(101)].map((_each, index) => {
  return { title: `${index}` };
});

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
  title: {
    fontSize: 32,
  },
});
