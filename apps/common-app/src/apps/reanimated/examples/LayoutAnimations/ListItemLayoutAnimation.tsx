import React, { memo, useCallback, useState } from 'react';
import type { ListRenderItem } from 'react-native';
import {
  Dimensions,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  CurvedTransition,
  EntryExitTransition,
  FadeIn,
  FadeOut,
  FadingTransition,
  JumpingTransition,
  LayoutAnimationConfig,
  LinearTransition,
  SequencedTransition,
} from 'react-native-reanimated';

const ITEMS = ['Item 1', 'Item 2', 'Item 3', 'Item 4', 'Item 5'];
const LAYOUT_TRANSITIONS = [
  LinearTransition,
  FadingTransition,
  SequencedTransition,
  JumpingTransition,
  CurvedTransition,
  EntryExitTransition,
] as const;

type ListItemProps = {
  id: string;
  text: string;
  onPress: (id: string) => void;
};

const ListItem = memo(function ({ id, text, onPress }: ListItemProps) {
  return (
    <Pressable onPress={() => onPress(id)} style={styles.listItem}>
      <Text style={styles.itemText}>{text}</Text>
    </Pressable>
  );
});

export default function ListItemLayoutAnimation() {
  const [layoutTransitionEnabled, setLayoutTransitionEnabled] = useState(true);
  const [currentTransitionIndex, setCurrentTransitionIndex] = useState(0);
  const [items, setItems] = useState(ITEMS);

  const removeItem = useCallback((id: string) => {
    setItems((prevItems) => prevItems.filter((item) => item !== id));
  }, []);

  const renderItem = useCallback<ListRenderItem<string>>(
    ({ item }) => <ListItem id={item} text={item} onPress={removeItem} />,
    [removeItem]
  );

  const getNewItemName = useCallback(() => {
    let i = 1;
    while (items.includes(`Item ${i}`)) {
      i++;
    }
    return `Item ${i}`;
  }, [items]);

  const reorderItems = useCallback(() => {
    setItems((prevItems) => {
      const newItems = [...prevItems];
      newItems.sort(() => Math.random() - 0.5);
      return newItems;
    });
  }, []);

  const resetOrder = useCallback(() => {
    setItems((prevItems) => {
      const newItems = [...prevItems];
      newItems.sort((left, right) => {
        const aNum = parseInt(left.match(/\d+$/)![0], 10);
        const bNum = parseInt(right.match(/\d+$/)![0], 10);
        return aNum - bNum;
      });
      return newItems;
    });
  }, []);

  const transition = layoutTransitionEnabled
    ? LAYOUT_TRANSITIONS[currentTransitionIndex]
    : undefined;

  return (
    <LayoutAnimationConfig skipEntering>
      <SafeAreaView style={styles.container}>
        <View style={styles.menu}>
          <View style={styles.row}>
            <Text style={styles.infoText}>Layout animation: </Text>
            <TouchableOpacity
              onPress={() => {
                setLayoutTransitionEnabled((prev) => !prev);
              }}>
              <Text style={styles.buttonText}>
                {layoutTransitionEnabled ? 'Enabled' : 'Disabled'}
              </Text>
            </TouchableOpacity>
          </View>
          {transition && (
            <Animated.View
              style={styles.row}
              entering={FadeIn}
              exiting={FadeOut}>
              <Text style={styles.infoText}>
                Current: {transition?.presetName}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setCurrentTransitionIndex(
                    (prev) => (prev + 1) % LAYOUT_TRANSITIONS.length
                  );
                }}>
                <Text style={styles.buttonText}>Change</Text>
              </TouchableOpacity>
            </Animated.View>
          )}
        </View>

        <Animated.FlatList
          style={styles.list}
          data={items}
          renderItem={renderItem}
          keyExtractor={(item) => item}
          contentContainerStyle={styles.contentContainer}
          itemLayoutAnimation={layoutTransitionEnabled ? transition : undefined}
          layout={transition}
        />

        <Animated.View style={styles.menu} layout={transition}>
          <Text style={styles.infoText}>Press an item to remove it</Text>
          <TouchableOpacity
            onPress={() => setItems([...items, getNewItemName()])}>
            <Text style={styles.buttonText}>Add item</Text>
          </TouchableOpacity>
          <Animated.View style={styles.row} layout={transition}>
            <TouchableOpacity onPress={reorderItems}>
              <Text style={styles.buttonText}>Reorder</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={resetOrder}>
              <Text style={styles.buttonText}>Reset order</Text>
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>
      </SafeAreaView>
    </LayoutAnimationConfig>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    gap: 16,
  },
  row: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'center',
  },
  list: {
    flexGrow: 0,
    maxHeight: Dimensions.get('window').height - 300,
  },
  listItem: {
    padding: 20,
    backgroundColor: '#b58df1',
    shadowColor: '#000',
    shadowOpacity: 0.05,
  },
  itemText: {
    color: 'white',
    fontSize: 22,
  },
  menu: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 16,
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
