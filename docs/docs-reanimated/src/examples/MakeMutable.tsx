import { StyleSheet, View, TouchableOpacity, Text } from 'react-native';

import React, { useCallback, useMemo, useState } from 'react';
import Animated, {
  makeMutable,
  runOnJS,
  runOnUI,
  useAnimatedStyle,
} from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import useThemedTextStyle from '@site/src/hooks/useThemedTextStyle';

type CheckListSelectorProps = {
  items: string[];
  onSubmit: (selectedItems: string[]) => void;
};

function CheckListSelector({ items, onSubmit }: CheckListSelectorProps) {
  const textColor = useThemedTextStyle();

  const checkListItemProps = useMemo(
    () =>
      items.map((item) => ({
        item,
        // highlight-next-line
        selected: makeMutable(false),
      })),
    [items]
  );

  const handleSubmit = useCallback(() => {
    runOnUI(() => {
      const selectedItems = checkListItemProps
        .filter((props) => props.selected.value)
        .map((props) => props.item);

      runOnJS(onSubmit)(selectedItems);
    })();
  }, [checkListItemProps, onSubmit]);

  return (
    <View style={styles.checkList}>
      {checkListItemProps.map((props) => (
        <CheckListItem key={props.item} {...props} />
      ))}
      <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
        <Text style={[styles.submitButtonText, textColor]}>Submit</Text>
      </TouchableOpacity>
    </View>
  );
}

type CheckListItemProps = {
  item: string;
  selected: SharedValue<boolean>;
};

function CheckListItem({ item, selected }: CheckListItemProps) {
  const textColor = useThemedTextStyle();

  const onPress = useCallback(() => {
    // highlight-start
    // No need to update the array of selected items, just toggle
    // the selected value thanks to separate shared values
    runOnUI(() => {
      selected.value = !selected.value;
    })();
    // highlight-end
  }, [selected]);

  return (
    <TouchableOpacity style={styles.listItem} onPress={onPress}>
      {/* highlight-start */}
      {/* No need to use `useDerivedValue` hook to get the `selected` value */}
      <CheckBox value={selected} />
      {/* highlight-end */}
      <Text style={[styles.listItemText, textColor]}>{item}</Text>
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
  const textColor = useThemedTextStyle();
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  return (
    <View style={styles.container}>
      <CheckListSelector items={ITEMS} onSubmit={setSelectedItems} />
      <Text style={textColor}>
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
    borderColor: 'var(--swm-purple-dark-100)',
  },
  checkBoxTick: {
    flex: 1,
    borderRadius: 2,
    backgroundColor: 'var(--swm-purple-dark-100)',
  },
  submitButton: {
    backgroundColor: 'var(--swm-purple-dark-100)',
    alignItems: 'center',
    borderRadius: 4,
    padding: 8,
    marginTop: 16,
  },
  submitButtonText: {
    color: 'var(--swm-off-white)',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
