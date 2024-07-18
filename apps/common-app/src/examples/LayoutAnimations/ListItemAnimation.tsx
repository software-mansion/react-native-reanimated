import React, { memo, useCallback, useState } from 'react';
import type { ListRenderItem } from 'react-native';
import {
  Dimensions,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
} from 'react-native';
import Animated, {
  LayoutAnimationConfig,
  LinearTransition,
} from 'react-native-reanimated';

const ITEMS = [1, 2, 3, 4, 5];

type ListItemProps = {
  id: number;
  text: number;
  onPress: (id: number) => void;
};

const ListItem = memo(function ({ id, text, onPress }: ListItemProps) {
  return (
    <Pressable onPress={() => onPress(id)} style={styles.listItem}>
      <Text style={styles.itemText}>{text}</Text>
    </Pressable>
  );
});

export default function ListItemAnimation() {
  const [items, setItems] = useState(ITEMS);

  const removeItem = useCallback((id: number) => {
    setItems((prevItems) => prevItems.filter((item) => item !== id));
  }, []);

  const addItem = useCallback(() => {
    let counter = 1;
    for (const num of items) {
      if (num === counter) {
        counter++;
      } else {
        break;
      }
    }
    setItems((prevItems) => [...prevItems, counter]);
  }, [items]);

  const renderItem = useCallback<ListRenderItem<number>>(
    ({ item }) => <ListItem id={item} text={item} onPress={removeItem} />,
    [removeItem]
  );

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
      newItems.sort((a, b) => a - b);
      return newItems;
    });
  }, []);

  const transition = LinearTransition;

  return (
    // Skip initial entering animation
    <LayoutAnimationConfig skipEntering>
      <SafeAreaView style={styles.container}>
        <Animated.FlatList
          style={styles.list}
          data={items}
          renderItem={renderItem}
          keyExtractor={(item) => item.toString()}
          contentContainerStyle={styles.contentContainer}
          itemLayoutAnimation={transition}
          layout={transition}
        />
        <Animated.View style={styles.bottomMenu} layout={transition}>
          <Text>Press an item to remove it</Text>
          <TouchableOpacity style={styles.button} onPress={addItem}>
            <Text style={styles.buttonText}>Add item</Text>
          </TouchableOpacity>
          <Animated.View style={styles.row} layout={transition}>
            <TouchableOpacity style={styles.button} onPress={reorderItems}>
              <Text style={styles.buttonText}>Reorder</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.button} onPress={resetOrder}>
              <Text style={styles.buttonText}>Reset</Text>
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
    justifyContent: 'space-between',
  },
  list: {
    flexGrow: 0,
    maxHeight: Dimensions.get('window').height - 250,
  },
  listItem: {
    padding: 16,
    backgroundColor: '#ad8ee9',
    shadowColor: '#000',
    shadowOpacity: 0.05,
  },
  itemText: {
    color: 'white',
    fontSize: 18,
  },
  bottomMenu: {
    alignItems: 'center',
    flex: 1,
  },
  button: {
    paddingTop: 16,
    width: 100,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 16,
    color: '#b59aeb',
  },
});
