import * as React from 'react';
import { Text, View, StyleSheet, Button } from 'react-native';
import Animated, {
  useAnimatedScrollHandler,
  useComposedEventHandler,
} from 'react-native-reanimated';

export default function ComposedHandlerExample() {
  const [toggleScroll, setToggleScroll] = React.useState(true);
  const [toggleDrag, setToggleDrag] = React.useState(true);
  const [toggleMomentum, setToggleMomentum] = React.useState(true);
  const [toggleBegin, setToggleBegin] = React.useState(true);
  const [toggleEnd, setToggleEnd] = React.useState(true);
  const [toggleAll, setToggleAll] = React.useState(true);

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

  const onBeginHandler = useAnimatedScrollHandler({
    onMomentumBegin(e) {
      handlerFunc('begin', e.eventName);
    },
    onBeginDrag(e) {
      handlerFunc('begin', e.eventName);
    },
  });

  const onEndHandler = useAnimatedScrollHandler({
    onMomentumEnd(e) {
      handlerFunc('end', e.eventName);
    },
    onEndDrag(e) {
      handlerFunc('end', e.eventName);
    },
  });

  const onAllHandler = useAnimatedScrollHandler({
    onScroll(e) {
      handlerFunc('all', e.eventName);
    },
    onMomentumBegin(e) {
      handlerFunc('all', e.eventName);
    },
    onMomentumEnd(e) {
      handlerFunc('all', e.eventName);
    },
    onBeginDrag(e) {
      handlerFunc('all', e.eventName);
    },
    onEndDrag(e) {
      handlerFunc('all', e.eventName);
    },
  });

  const composedHandler = useComposedEventHandler([
    toggleScroll ? onScrollHandler : {},
    toggleDrag ? onDragHandler : {},
    toggleMomentum ? onMomentumHandler : {},
    toggleBegin ? onBeginHandler : {},
    toggleEnd ? onEndHandler : {},
    toggleAll ? onAllHandler : {},
  ]);

  return (
    <View style={styles.container}>
      <ToggleButton
        name={'scroll'}
        isToggled={toggleScroll}
        onPressFunc={() => setToggleScroll(!toggleScroll)}
      />
      <ToggleButton
        name={'drag'}
        isToggled={toggleDrag}
        onPressFunc={() => setToggleDrag(!toggleDrag)}
      />
      <ToggleButton
        name={'momentum'}
        isToggled={toggleMomentum}
        onPressFunc={() => setToggleMomentum(!toggleMomentum)}
      />
      <ToggleButton
        name={'begin'}
        isToggled={toggleBegin}
        onPressFunc={() => setToggleBegin(!toggleBegin)}
      />
      <ToggleButton
        name={'end'}
        isToggled={toggleEnd}
        onPressFunc={() => setToggleEnd(!toggleEnd)}
      />
      <ToggleButton
        name={'all'}
        isToggled={toggleAll}
        onPressFunc={() => setToggleAll(!toggleAll)}
      />
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

type ToggleProps = {
  name: string;
  isToggled: boolean;
  onPressFunc: () => void;
};
const ToggleButton = ({ name, isToggled, onPressFunc }: ToggleProps) => (
  <View style={styles.toggleContainer}>
    <View
      style={[
        styles.toggleIcon,
        isToggled ? styles.toggleON : styles.toggleOFF,
      ]}
    />
    <Button
      title={`Toggle ${name} handler ${isToggled ? 'OFF' : 'ON'}`}
      onPress={onPressFunc}
    />
  </View>
);

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
  list: {
    flex: 1,
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
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 3,
    borderColor: 'black',
  },
  toggleON: {
    backgroundColor: '#7CFC00',
  },
  toggleOFF: {
    backgroundColor: 'red',
  },
});
