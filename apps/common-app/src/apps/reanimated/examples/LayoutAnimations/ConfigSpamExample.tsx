import React, { useEffect, useState } from 'react';
import {
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  LayoutAnimationConfig,
  LinearTransition,
  SequencedTransition,
} from 'react-native-reanimated';

const ITEMS = ['Item 1', 'Item 2', 'Item 3', 'Item 4', 'Item 5'];

const TRANSITIONS = [
  LinearTransition.duration(200),
  LinearTransition.duration(600),
  SequencedTransition.duration(400),
  undefined,
] as const;

const SPAM_INTERVAL_MS = 60;

export default function ConfigSpamExample() {
  const [items, setItems] = useState(ITEMS);
  const [spamming, setSpamming] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!spamming) {
      return;
    }
    const id = setInterval(() => setTick((prev) => prev + 1), SPAM_INTERVAL_MS);
    return () => clearInterval(id);
  }, [spamming]);

  const addItem = () => {
    let i = 1;
    while (items.includes(`Item ${i}`)) {
      i++;
    }
    setItems([...items, `Item ${i}`]);
  };

  const reorderItems = () => {
    setItems((prevItems) => [...prevItems].sort(() => Math.random() - 0.5));
  };

  const resetOrder = () => {
    setItems((prevItems) =>
      [...prevItems].sort(
        (left, right) =>
          parseInt(left.match(/\d+$/)![0], 10) -
          parseInt(right.match(/\d+$/)![0], 10)
      )
    );
  };

  return (
    <LayoutAnimationConfig skipEntering>
      <SafeAreaView style={styles.container}>
        <View style={styles.menu}>
          <Text style={styles.infoText}>Press an item to remove it</Text>
          <TouchableOpacity onPress={() => setSpamming((prev) => !prev)}>
            <Text style={styles.buttonText}>
              {spamming ? 'Stop configs' : 'Spam configs'}
            </Text>
          </TouchableOpacity>
          <View style={styles.row}>
            <TouchableOpacity onPress={addItem}>
              <Text style={styles.buttonText}>Add item</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={reorderItems}>
              <Text style={styles.buttonText}>Reorder</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={resetOrder}>
              <Text style={styles.buttonText}>Reset order</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.list}>
          {items.map((item) => (
            <Animated.View
              key={item}
              layout={TRANSITIONS[tick % TRANSITIONS.length]}
              entering={tick % 2 === 0 ? FadeIn : undefined}
              exiting={tick % 2 === 0 ? FadeOut : undefined}>
              <Pressable
                onPress={() =>
                  setItems((prevItems) =>
                    prevItems.filter((other) => other !== item)
                  )
                }
                style={styles.listItem}>
                <Text style={styles.itemText}>{item}</Text>
              </Pressable>
            </Animated.View>
          ))}
        </View>
      </SafeAreaView>
    </LayoutAnimationConfig>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'center',
  },
  list: {
    padding: 16,
    gap: 16,
  },
  listItem: {
    padding: 20,
    backgroundColor: '#b58df1',
  },
  itemText: {
    color: 'white',
    fontSize: 22,
  },
  menu: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  infoText: {
    color: '#222534',
    fontSize: 18,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#b58df1',
  },
});
