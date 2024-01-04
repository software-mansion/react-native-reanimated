import React from 'react';
import { TouchableOpacity, View, Text, ScrollView } from 'react-native';
import {
  useAnimatedRef,
  useDerivedValue,
  useSharedValue,
  scrollTo,
} from 'react-native-reanimated';

const ITEM_COUNT = 10;
const ITEM_SIZE = 100;
const ITEM_MARGIN = 10;

export default function App() {
  const aref = useAnimatedRef();
  const scroll = useSharedValue(0);

  useDerivedValue(() => {
    scrollTo(aref, 0, scroll.value * (ITEM_SIZE + 2 * ITEM_MARGIN), true);
  });

  const items = Array.from(Array(ITEM_COUNT).keys());

  return (
    <View style={{ flex: 1, flexDirection: 'column' }}>
      <Incrementor increment={1} scroll={scroll} />
      <View
        style={{ width: '100%', height: (ITEM_SIZE + 2 * ITEM_MARGIN) * 2 }}>
        <ScrollView ref={aref} style={{ backgroundColor: 'orange' }}>
          {items.map((_, i) => (
            <View
              key={i}
              style={{
                backgroundColor: 'white',
                aspectRatio: 1,
                width: ITEM_SIZE,
                margin: ITEM_MARGIN,
                justifyContent: 'center',
                alignContent: 'center',
              }}>
              <Text style={{ textAlign: 'center' }}>{i}</Text>
            </View>
          ))}
        </ScrollView>
      </View>

      <Incrementor increment={-1} scroll={scroll} />
    </View>
  );
}

const Incrementor = ({ increment, scroll }) => (
  <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
    <TouchableOpacity
      onPress={() => {
        scroll.value =
          scroll.value + increment > 0
            ? scroll.value + increment
            : ITEM_COUNT - 1 + increment;

        if (scroll.value >= ITEM_COUNT - 2) scroll.value = 0;
      }}>
      <Text>{`Scroll ${Math.abs(increment)} ${
        increment > 0 ? 'down' : 'up'
      }`}</Text>
    </TouchableOpacity>
  </View>
);
