import { FlashList } from '@shopify/flash-list';
import React, { useRef, useState } from 'react';
import { useColorScheme } from '@mui/material';
import { Pressable, StyleSheet, Text, View, SafeAreaView } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';

const exampleStyles = StyleSheet.create({
  squaresContainer: {
    display: 'flex',
    flexDirection: 'row',
    gap: 16,
  },
  square: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    width: 100,
    height: 100,
    backgroundColor: '#f8f9ff',
    borderRadius: 20,
  },
  listContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  listWrapper: {
    borderRadius: 16,
    backgroundColor: '#f8f9ff',
  },
  listItem: {
    display: 'flex',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 2,
    padding: 8,
    paddingHorizontal: 32,
  },
});

const SECTION_HEIGHT = 350;

const BRAND_COLORS = ['#fa7f7c', '#b58df1', '#ffe780', '#82cab2'];

const SECTIONS = [
  {
    name: 'Overview',
    content: 'You can put here ✨ anything ✨ you want!',
  },
  {
    name: 'Squares',
    content: (
      <View style={exampleStyles.squaresContainer}>
        <View style={exampleStyles.square}>
          <Text>1</Text>
        </View>
        <View style={exampleStyles.square}>
          <Text>2</Text>
        </View>
        <View style={exampleStyles.square}>
          <Text>3</Text>
        </View>
      </View>
    ),
  },
  {
    name: 'Shopping list',
    content: (
      <View style={exampleStyles.listContainer}>
        <View style={exampleStyles.listWrapper}>
          <Text style={exampleStyles.listItem}>🍎 Apple </Text>
        </View>
        <View style={exampleStyles.listWrapper}>
          <Text style={exampleStyles.listItem}>🍌 Banana</Text>
        </View>
        <View style={exampleStyles.listWrapper}>
          <Text style={exampleStyles.listItem}>🥖 Bread</Text>
        </View>
      </View>
    ),
  },
];

function debounce(func, timeout = 100) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      func(...args);
    }, timeout);
  };
}

const useSelectedStyle = (selectedItem, item) =>
  useAnimatedStyle(() => ({
    fontWeight: selectedItem.value === item ? '600' : '400',
    borderBottomWidth: selectedItem.value === item ? 1 : 0,
  }));

const TableOfContentsElement = ({
  item,
  index,
  visibleIndex,
  sectionCardsRef,
}) => {
  const { colorScheme } = useColorScheme();
  const style = useSelectedStyle(visibleIndex, index);

  const tableOfContentsElementTextStyle = {
    color: colorScheme === 'light' ? '#001a72' : '#f8f9ff',
    borderBottomColor: colorScheme === 'light' ? '#001a72' : '#f8f9ff',
  };

  return (
    <Pressable
      onPress={() => {
        sectionCardsRef.current?.scrollToIndex({ index, animated: true });
        visibleIndex.value = index;
      }}
      style={[sectionListStyles.tableOfContentsElement]}>
      <Animated.Text
        style={[
          style,
          sectionListStyles.tableOfContentsElement,
          tableOfContentsElementTextStyle,
        ]}>
        {item}
      </Animated.Text>
    </Pressable>
  );
};

const TableOfContents = ({
  data,
  visibleIndex,
  sectionCardsRef,
  tableOfContentsRef,
}) => {
  return (
    <View style={sectionListStyles.tableOfContents}>
      <FlashList
        horizontal
        showsHorizontalScrollIndicator={false}
        renderItem={({ item, index }) => (
          <TableOfContentsElement
            item={item}
            visibleIndex={visibleIndex}
            index={index}
            sectionCardsRef={sectionCardsRef}
          />
        )}
        data={data}
        estimatedItemSize={52}
        ref={tableOfContentsRef}
      />
    </View>
  );
};

const SectionList = () => {
  const selectedItem = useSharedValue('');
  const visibleIndex = useSharedValue(0);
  const sectionNames = SECTIONS.map((s) => s.name);
  const sectionCardsRef = useRef(null);
  const tableOfContentsRef = useRef(null);

  return (
    <SafeAreaView style={sectionListStyles.cardsContainer}>
      <TableOfContents
        data={sectionNames}
        visibleIndex={visibleIndex}
        sectionCardsRef={sectionCardsRef}
        tableOfContentsRef={tableOfContentsRef}
      />
      <SectionCards
        sections={SECTIONS}
        visibleIndex={visibleIndex}
        tableOfContentsRef={tableOfContentsRef}
        sectionCardsRef={sectionCardsRef}
      />
    </SafeAreaView>
  );
};

const sectionListStyles = StyleSheet.create({
  cardsContainer: {
    flex: 1,
    justifyContent: 'center',
    height: 600,
  },
  flex: {
    flex: 1,
  },
  tableOfContentsElement: {
    padding: 4,
    marginHorizontal: 4,
    margin: 8,
    overflow: 'hidden',
  },
  tableOfContents: {
    top: 0,
  },
});

const SectionCards = ({
  sections,
  visibleIndex,
  sectionCardsRef,
  tableOfContentsRef,
}) => {
  const { colorScheme } = useColorScheme();
  const heights = sections.map((_) => SECTION_HEIGHT);

  const getOffsetStarts = () =>
    heights.map((v, i) => heights.slice(0, i).reduce((x, acc) => x + acc, 0));

  const onScroll = (event) => {
    const offset = event.nativeEvent?.contentOffset?.y;

    if (offset !== undefined) {
      const distancesFromTop = getOffsetStarts().map((v) =>
        Math.abs(v - offset)
      );
      const newIndex = distancesFromTop.indexOf(
        Math.min.apply(null, distancesFromTop)
      );
      if (visibleIndex.value !== newIndex) {
        tableOfContentsRef.current?.scrollToIndex({
          index: newIndex,
          animated: true,
        });
      }
      visibleIndex.value = newIndex;
    }
  };

  const sectionNameStyle = useAnimatedStyle(() => ({
    color: colorScheme === 'light' ? '#001a72' : '#f8f9ff',
  }));

  const renderItem = ({ item }) => {
    return (
      <View>
        <Animated.Text style={[sectionCardStyles.header, sectionNameStyle]}>
          {item.name}
        </Animated.Text>
        <SectionCardsElement>
          <Text style={sectionCardStyles.content}>{item.content}</Text>
        </SectionCardsElement>
      </View>
    );
  };

  return (
    <View style={sectionListStyles.flex}>
      <FlashList
        ref={sectionCardsRef}
        estimatedItemSize={52}
        estimatedFirstItemOffset={0}
        renderItem={renderItem}
        data={sections}
        onScrollBeginDrag={onScroll}
        onScrollEndDrag={onScroll}
        onScroll={debounce(onScroll)}
        onMomentumScrollBegin={onScroll}
        onMomentumScrollEnd={onScroll}
      />
    </View>
  );
};

const getRandomBrandColor = () => {
  const colorIndex = Math.floor(Math.random() * BRAND_COLORS.length);
  return BRAND_COLORS[colorIndex];
};

const SectionCardsElement = ({ children }) => {
  const [backgroundColor, setBackgroundColor] = useState(getRandomBrandColor());

  return (
    <View style={[sectionCardStyles.container, { backgroundColor }]}>
      {children}
      <Pressable
        style={sectionCardStyles.button}
        onPress={() => setBackgroundColor(getRandomBrandColor())}>
        <Text style={sectionCardStyles.buttonText}>
          Toggle section color 🎨
        </Text>
      </Pressable>
    </View>
  );
};

const sectionCardStyles = StyleSheet.create({
  container: {
    height: SECTION_HEIGHT,
    margin: 16,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    borderRadius: 24,
  },
  header: {
    textAlign: 'center',
    fontSize: 24,
    fontWeight: 'bold',
  },
  content: {
    color: '#001a72',
  },
  button: {
    backgroundColor: '#f8f9ff',
    padding: 12,
    borderRadius: 48,
  },
  buttonText: {
    color: '#001a72',
    padding: '0.5rem',
  },
});

export default SectionList;
