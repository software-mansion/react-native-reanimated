import React from 'react';
import { Text, View, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedScrollHandler,
  useComposedEventHandler,
} from 'react-native-reanimated';

export default function ComposedHandlerDifferentEventsExample() {
  const handlerFunc = React.useCallback(
    (handlerName: string, eventName: string) => {
      'worklet';
      console.log(`${handlerName} handler: ${eventName}`);
    },
    []
  );

  const onScrollHandler = useAnimatedScrollHandler({
    onScroll(e) {
      handlerFunc('scroll', e.eventName);
    },
  });

  const onDragHandler = useAnimatedScrollHandler({
    onBeginDrag(e) {
      handlerFunc('drag', e.eventName);
    },
    onEndDrag(e) {
      handlerFunc('drag', e.eventName);
    },
  });

  const onMomentumHandler = useAnimatedScrollHandler({
    onMomentumBegin(e) {
      handlerFunc('momentum', e.eventName);
    },
    onMomentumEnd(e) {
      handlerFunc('momentum', e.eventName);
    },
  });

  const composedHandler = useComposedEventHandler([
    onScrollHandler,
    onDragHandler,
    onMomentumHandler,
  ]);

  return (
    <View style={styles.container}>
      <Text style={styles.infoText}>Check console logs!</Text>
      <Animated.FlatList
        onScroll={composedHandler}
        style={styles.list}
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
  infoText: {
    fontSize: 19,
    alignSelf: 'center',
  },
  list: {
    flex: 1,
  },
  item: {
    backgroundColor: '#66e3c0',
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
