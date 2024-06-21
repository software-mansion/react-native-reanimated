import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import Animated, {
  LinearTransition,
  SequencedTransition,
  FadingTransition,
  FadeOut,
  useDerivedValue,
  withTiming,
  useSharedValue,
  JumpingTransition,
  useAnimatedStyle,
  withDelay,
} from 'react-native-reanimated';

const DROPDOWN_OFFSET = 48;

const INITIAL_LIST = [
  { id: 1, emoji: '🍌', color: '#b58df1' },
  { id: 2, emoji: '🍎', color: '#ffe780' },
  { id: 3, emoji: '🥛', color: '#fa7f7c' },
  { id: 4, emoji: '🍙', color: '#82cab2' },
  { id: 5, emoji: '🍇', color: '#fa7f7c' },
  { id: 6, emoji: '🍕', color: '#b58df1' },
  { id: 7, emoji: '🍔', color: '#ffe780' },
  { id: 8, emoji: '🍟', color: '#b58df1' },
  { id: 9, emoji: '🍩', color: '#82cab2' },
];

const LAYOUT_TRANSITIONS = [
  { label: 'Linear Transition', value: LinearTransition },
  { label: 'Sequenced Transition', value: SequencedTransition },
  { label: 'Fading Transition', value: FadingTransition },
  { label: 'Jumping Transition', value: JumpingTransition },
  // { label: 'Curved Transition', value: CurvedTransition },
  // {
  //   label: 'Entry/Exit Transition',
  //   value: EntryExitTransition.exiting(FlipOutYLeft),
  // },
  // TODO: in the future Curved and Entry/Exit will be available on web, now they don't so we don't use them.
];

const DropdownItems = ({ isExpanded, selected, setSelected }) => {
  const selectItem = (item) => {
    setSelected(item);
    isExpanded.value = !isExpanded.value;
  };
  return (
    <View>
      {LAYOUT_TRANSITIONS.filter((item) => item.label != selected.label).map(
        (transition) => (
          <TouchableOpacity
            style={dropdownStyles.item}
            onPress={() => selectItem(transition)}>
            <Text style={dropdownStyles.label}>{transition.label}</Text>
          </TouchableOpacity>
        )
      )}
    </View>
  );
};

const DropdownItem = ({ isExpanded, children }) => {
  const height = useSharedValue(0);

  const derivedHeight = useDerivedValue(() =>
    withTiming(height.value * Number(isExpanded.value), {
      duration: 500,
    })
  );
  const bodyStyle = useAnimatedStyle(() => ({
    height: derivedHeight.value,
  }));

  return (
    <Animated.View style={[styles.animatedView, bodyStyle]}>
      <View
        onLayout={(e) => {
          height.value = e.nativeEvent.layout.height;
        }}
        style={styles.wrapper}>
        {children}
      </View>
    </Animated.View>
  );
};

const DropdownParent = ({ selected, setSelected, isExpanded }) => {
  return (
    <View>
      <DropdownItem isExpanded={isExpanded}>
        <DropdownItems
          setSelected={setSelected}
          selected={selected}
          isExpanded={isExpanded}
        />
      </DropdownItem>
    </View>
  );
};

const Dropdown = ({ selected, onSelect }) => {
  const isExpanded = useSharedValue(false);
  const onPress = () => {
    isExpanded.value = !isExpanded.value;
  };
  const labelRef = useRef();

  const dropdownBackgroundAnimatedStyles = useAnimatedStyle(() => {
    const colorValue = isExpanded.value ? '#c1c6e5' : '#eef0ff';
    return {
      backgroundColor: withDelay(50, withTiming(colorValue)),
    };
  });

  const dropdownListAnimatedStyles = useAnimatedStyle(() => {
    const paddingValue = isExpanded.value ? 8 : 0;
    return {
      paddingBottom: withDelay(50, withTiming(paddingValue)),
    };
  });

  return (
    <View style={dropdownStyles.container}>
      <TouchableOpacity ref={labelRef} onPress={onPress}>
        <Animated.Text
          style={[
            dropdownBackgroundAnimatedStyles,
            dropdownStyles.selectedLabel,
            dropdownStyles.label,
          ]}>
          {selected.label}
        </Animated.Text>
      </TouchableOpacity>

      <Animated.View
        style={[
          {
            top: labelRef.current
              ? labelRef.current.offsetHeight
              : DROPDOWN_OFFSET,
          },
          dropdownStyles.items,
          dropdownBackgroundAnimatedStyles,
          dropdownListAnimatedStyles,
        ]}>
        <DropdownParent
          selected={selected}
          isExpanded={isExpanded}
          setSelected={onSelect}
        />
      </Animated.View>
    </View>
  );
};

const dropdownStyles = StyleSheet.create({
  container: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'center',
    zIndex: 2,
    position: 'relative',
    marginBottom: 8,
  },
  items: {
    flexDirection: 'column',
    position: 'absolute',
    minWidth: 300,
    zIndex: -1,
  },
  item: {
    margin: 8,
  },
  label: {
    fontFamily: 'Aeonik',
    color: '#001a72',
    fontSize: 16,
    textAlign: 'center',
  },
  selectedLabel: {
    fontWeight: '500',
    padding: 16,
    minWidth: 300,
  },
});

export default function App() {
  const [items, setItems] = useState(INITIAL_LIST);
  const [selected, setSelected] = useState(LAYOUT_TRANSITIONS[0]);

  const removeItem = (idToRemove) => {
    const updatedItems = items.filter((item) => item.id !== idToRemove);
    setItems(updatedItems);
  };

  const onSelect = (item) => {
    setSelected(item);
    setItems(INITIAL_LIST);
  };

  return (
    <SafeAreaView style={styles.container}>
      <Dropdown selected={selected} onSelect={onSelect} />
      <View>
        <Items selected={selected} items={items} onRemove={removeItem} />
      </View>
    </SafeAreaView>
  );
}

function Items({ selected, items, onRemove }) {
  return (
    <View style={styles.gridContainer}>
      {items.map((item) => (
        <Animated.View
          key={item.id}
          layout={selected.value}
          exiting={FadeOut}
          style={[styles.tileContainer, { backgroundColor: item.color }]}>
          <Tile emoji={item.emoji} onRemove={() => onRemove(item.id)} />
        </Animated.View>
      ))}
    </View>
  );
}

function Tile({ emoji, onRemove }) {
  return (
    <TouchableOpacity onPress={onRemove} style={styles.tile}>
      <Animated.Text style={styles.tileLabel}>{emoji}</Animated.Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 32,
    width: 'auto',
    display: 'flex',
    minHeight: 300,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  tileContainer: {
    width: '20%',
    margin: '1%',
    borderRadius: 16,
    minHeight: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tile: {
    flex: 1,
    height: '100%',
    width: ' 100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tileLabel: {
    color: '#f8f9ff',
    fontSize: 24,
  },
  wrapper: {
    width: '100%',
    position: 'absolute',
    display: 'flex',
    alignItems: 'center',
  },
  animatedView: {
    width: '100%',
    overflow: 'hidden',
  },
});
