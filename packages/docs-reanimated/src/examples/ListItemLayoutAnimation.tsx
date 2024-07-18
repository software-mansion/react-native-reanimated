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

const ITEMS = ['Item 1', 'Item 2', 'Item 3', 'Item 4', 'Item 5'];

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
  const [items, setItems] = useState(ITEMS);

  const handlePress = useCallback((id: string) => {
    setItems((prevItems) => prevItems.filter((item) => item !== id));
  }, []);

  const renderItem = useCallback<ListRenderItem<string>>(
    ({ item }) => <ListItem id={item} text={item} onPress={handlePress} />,
    [handlePress]
  );

  const findItemName = useCallback(() => {
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
      newItems.sort((a, b) => {
        const aNum = parseInt(a.match(/\d+$/)![0], 10);
        const bNum = parseInt(b.match(/\d+$/)![0], 10);
        return aNum - bNum;
      });
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
          keyExtractor={(item) => item}
          contentContainerStyle={styles.contentContainer}
          itemLayoutAnimation={transition}
          layout={transition}
        />
        <Animated.View style={styles.bottomMenu} layout={transition}>
          <Text style={styles.infoText}>Press an item to remove it</Text>
          <TouchableOpacity
            style={styles.button}
            onPress={() => setItems([...items, findItemName()])}>
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
    padding: 20,
    backgroundColor: '#ad8ee9',
    shadowColor: '#000',
    shadowOpacity: 0.05,
  },
  itemText: {
    color: 'white',
    fontSize: 22,
  },
  bottomMenu: {
    alignItems: 'center',
    flex: 1,
  },
  button: {
    paddingTop: 20,
    width: 100,
    alignItems: 'center',
  },
  infoText: {
    color: '#222534',
    fontSize: 18,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#b59aeb',
  },
});
