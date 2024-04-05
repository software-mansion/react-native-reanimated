import * as React from 'react';
import { Text, View, StyleSheet } from 'react-native';
import Animated, { useAnimatedScrollHandler } from 'react-native-reanimated';

export default function EmptyExample() {
  const onScrollHandler = useAnimatedScrollHandler({
    onScroll(e) {
      'worklet';
      console.log(`scroll handler: ${e.eventName}`);
    },
  });

  const onDragHandler = useAnimatedScrollHandler({
    onBeginDrag(e) {
      'worklet';
      console.log(`drag handler: ${e.eventName}`);
    },
    onEndDrag(e) {
      'worklet';
      console.log(`drag handler: ${e.eventName}`);
    },
  });

  const onMomentumHandler = useAnimatedScrollHandler({
    onMomentumBegin(e) {
      'worklet';
      console.log(`momentum handler: ${e.eventName}`);
    },
    onMomentumEnd(e) {
      'worklet';
      console.log(`momentum handler: ${e.eventName}`);
    },
  });

  const onBeginHandler = useAnimatedScrollHandler({
    onMomentumBegin(e) {
      'worklet';
      console.log(`begin handler: ${e.eventName}`);
    },
    onBeginDrag(e) {
      'worklet';
      console.log(`begin handler: ${e.eventName}`);
    },
  });

  const onEndHandler = useAnimatedScrollHandler({
    onMomentumEnd(e) {
      'worklet';
      console.log(`end handler: ${e.eventName}`);
    },
    onEndDrag(e) {
      'worklet';
      console.log(`end handler: ${e.eventName}`);
    },
  });

  const onAllHandler = useAnimatedScrollHandler({
    onScroll(e) {
      'worklet';
      console.log(`all handler: ${e.eventName}`);
    },
    onMomentumBegin(e) {
      'worklet';
      console.log(`all handler: ${e.eventName}`);
    },
    onMomentumEnd(e) {
      'worklet';
      console.log(`all handler: ${e.eventName}`);
    },
    onBeginDrag(e) {
      'worklet';
      console.log(`all handler: ${e.eventName}`);
    },
    onEndDrag(e) {
      'worklet';
      console.log(`all handler: ${e.eventName}`);
    },
  });

  return (
    <View style={styles.container}>
      <Animated.FlatList
        onScroll={[
          onScrollHandler,
          onDragHandler,
          onMomentumHandler,
          onBeginHandler,
          onEndHandler,
          onAllHandler,
        ]}
        style={styles.listA}
        data={items}
        renderItem={({ item }) => <Item title={item.title} />}
        keyExtractor={(item) => `A:${item.title}`}
      />
    </View>
  );
}

type ItemValue = { title: string };
const items: ItemValue[] = [...new Array(101)].map((_each, index) => {
  return { title: `${index}` };
});

type ItemProps = { title: string };
const Item = ({ title }: ItemProps) => (
  <View style={styles.item}>
    <Text style={styles.title}>{title}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column',
  },
  listA: {
    flex: 1,
    backgroundColor: '#5F9EA0',
  },
  item: {
    backgroundColor: '#F0FFFF',
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
