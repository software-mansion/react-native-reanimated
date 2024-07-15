import {
  Text,
  StyleSheet,
  View,
  TouchableOpacity,
  useColorScheme,
} from 'react-native';

import React, { useCallback, useMemo, useState } from 'react';
import Animated, {
  makeMutable,
  useAnimatedStyle,
} from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';

type CheckListSelectorProps = {
  items: string[];
  onSubmit: (selectedItems: string[]) => void;
};

function CheckListSelector({ items, onSubmit }: CheckListSelectorProps) {
  const checListItemProps = useMemo(
    () =>
      items.map((item) => ({
        item,
        // highlight-next-line
        selected: makeMutable(false),
      })),
    [items]
  );

  const handleSubmit = useCallback(() => {
    const selectedItems = checListItemProps
      .filter((props) => props.selected.value)
      .map((props) => props.item);

    onSubmit(selectedItems);
  }, [checListItemProps, onSubmit]);

  return (
    <View style={styles.checkList}>
      {checListItemProps.map((props) => (
        <CheckListItem key={props.item} {...props} />
      ))}
      <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
        <Text style={styles.submitButtonText}>Submit</Text>
      </TouchableOpacity>
    </View>
  );
}

type CheckListItemProps = {
  item: string;
  selected: SharedValue<boolean>;
};

function CheckListItem({ item, selected }: CheckListItemProps) {
  const scheme = useColorScheme();
  const onPress = useCallback(() => {
    // highlight-start
    // No need to update the array of selected items, just toggle
    // the selected value thanks to separate shared values
    selected.value = !selected.value;
    // highlight-end
  }, [selected]);

  return (
    <TouchableOpacity style={styles.listItem} onPress={onPress}>
      {/* highlight-start */}
      {/* No need to use `useDerivedValue` hook to get the `selected` value */}
      <CheckBox value={selected} />
      {/* highlight-end */}
      <Text
        style={[
          styles.listItemText,
          { color: scheme === 'dark' ? 'white' : 'black' },
        ]}>
        {item}
      </Text>
    </TouchableOpacity>
  );
}

type CheckBoxProps = {
  value: SharedValue<boolean>;
};

function CheckBox({ value }: CheckBoxProps) {
  const checkboxTickStyle = useAnimatedStyle(() => ({
    opacity: value.value ? 1 : 0,
  }));

  return (
    <View style={styles.checkBox}>
      <Animated.View style={[styles.checkBoxTick, checkboxTickStyle]} />
    </View>
  );
}

const ITEMS = [
  '🐈 Cat',
  '🐕 Dog',
  '🦆 Duck',
  '🐇 Rabbit',
  '🐁 Mouse',
  '🐓 Rooster',
];

export default function App() {
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const scheme = useColorScheme();

  return (
    <View style={styles.container}>
      <CheckListSelector items={ITEMS} onSubmit={setSelectedItems} />
      <Text style={{ color: scheme === 'dark' ? 'white' : 'black' }}>
        Selected items:{' '}
        {selectedItems.length ? selectedItems.join(', ') : 'None'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkList: {
    gap: 8,
    padding: 16,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  listItemText: {
    fontSize: 20,
  },
  checkBox: {
    width: 16,
    height: 16,
    borderRadius: 4,
    borderWidth: 1,
    padding: 2,
    borderColor: '#b58df1',
  },
  checkBoxTick: {
    flex: 1,
    borderRadius: 2,
    backgroundColor: '#b58df1',
  },
  submitButton: {
    backgroundColor: '#b58df1',
    color: 'white',
    alignItems: 'center',
    borderRadius: 4,
    padding: 8,
    marginTop: 16,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
