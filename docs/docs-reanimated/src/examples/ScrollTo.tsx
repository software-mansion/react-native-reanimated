import React from 'react';
import { Button, View, Text, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedRef,
  useDerivedValue,
  useSharedValue,
  scrollTo,
} from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';

const ITEM_COUNT = 10;
const ITEM_SIZE = 100;
const ITEM_MARGIN = 10;

export default function App() {
  const animatedRef = useAnimatedRef<Animated.ScrollView>();
  const scroll = useSharedValue<number>(0);

  useDerivedValue(() => {
    // highlight-start
    scrollTo(
      animatedRef,
      0,
      scroll.value * (ITEM_SIZE + 2 * ITEM_MARGIN),
      true
    );
    // highlight-end
  });

  const items = Array.from(Array(ITEM_COUNT).keys());

  return (
    <View style={styles.container}>
      <Incrementor increment={-1} scroll={scroll} />
      <View style={styles.boxWrapper}>
        <Animated.ScrollView ref={animatedRef}>
          {items.map((_, i) => (
            <View key={i} style={styles.box}>
              <Text style={{ textAlign: 'center' }}>{i}</Text>
            </View>
          ))}
        </Animated.ScrollView>
      </View>
      <Incrementor increment={1} scroll={scroll} />
    </View>
  );
}

const Incrementor = ({
  increment,
  scroll,
}: {
  increment: number;
  scroll: SharedValue<number>;
}) => (
  <View style={styles.buttonWrapper}>
    <Button
      onPress={() => {
        scroll.value =
          scroll.value + increment > 0
            ? scroll.value + increment
            : ITEM_COUNT - 1 + increment;

        if (scroll.value >= ITEM_COUNT - 2) scroll.value = 0;
      }}
      title={`Scroll ${Math.abs(increment)} ${increment > 0 ? 'down' : 'up'}`}
    />
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
  },
  buttonWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  box: {
    width: ITEM_SIZE,
    height: ITEM_SIZE,
    margin: ITEM_MARGIN,
    borderRadius: 15,
    backgroundColor: '#b58df1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxWrapper: {
    width: '100%',
    height: 250,
    alignItems: 'center',
  },
});
