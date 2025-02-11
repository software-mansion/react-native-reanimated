import React from 'react';
import { Button, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedScrollHandler,
  useComposedEventHandler,
} from 'react-native-reanimated';

export default function ComposedHandlerConditionalExample() {
  const [toggleFirst, setToggleFirst] = React.useState(true);
  const [toggleSecond, setToggleSecond] = React.useState(true);
  const [toggleThird, setToggleThird] = React.useState(true);

  const handlerFunc = React.useCallback(
    (handlerName: string, eventName: string) => {
      'worklet';
      console.log(`${handlerName} handler: ${eventName}`);
    },
    []
  );

  const firstHandler = useAnimatedScrollHandler({
    onScroll(e) {
      handlerFunc('first', e.eventName);
    },
  });

  const secondHandler = useAnimatedScrollHandler({
    onScroll(e) {
      handlerFunc('second', e.eventName);
    },
  });

  const thirdHandler = useAnimatedScrollHandler({
    onScroll(e) {
      handlerFunc('third', e.eventName);
    },
  });

  const composedHandler = useComposedEventHandler([
    toggleFirst ? firstHandler : null,
    toggleSecond ? secondHandler : null,
    toggleThird ? thirdHandler : null,
  ]);

  return (
    <View style={styles.container}>
      <Text style={styles.infoText}>Check console logs!</Text>
      <ToggleButton
        name={'first'}
        isToggled={toggleFirst}
        onPressFunc={() => setToggleFirst(!toggleFirst)}
      />
      <ToggleButton
        name={'second'}
        isToggled={toggleSecond}
        onPressFunc={() => setToggleSecond(!toggleSecond)}
      />
      <ToggleButton
        name={'third'}
        isToggled={toggleThird}
        onPressFunc={() => setToggleThird(!toggleThird)}
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
  infoText: {
    fontSize: 19,
    alignSelf: 'center',
  },
  list: {
    flex: 1,
  },
  item: {
    backgroundColor: '#883ef0',
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
