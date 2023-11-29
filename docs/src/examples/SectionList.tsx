import { FlashList, ListRenderItem } from '@shopify/flash-list';
import React, { PropsWithChildren, RefObject, useRef, useState } from 'react';
import {
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  SharedValue,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';

export type Section<T> = {
  name: string;
  data: T;
};

type ContentList<T> = FlashList<Section<T>>;
type ContentListRef<T> = RefObject<ContentList<T>>;
type TableOfContentsRef = RefObject<FlashList<string>>;

type Props<T> = {
  sections: Section<T>[];
  renderItem: (item: T) => JSX.Element;
};

const primaryColor = '#f8a';
const secondaryColor = '#aaf';

function debounce(func: (...args: any[]) => void, timeout = 100) {
  let timer: NodeJS.Timeout;
  return (...args: any[]) => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      func(...args);
    }, timeout);
  };
}

const useSelectedStyle = <T,>(selectedItem: SharedValue<T>, item: T) =>
  useAnimatedStyle(() => ({
    backgroundColor:
      selectedItem.value === item ? primaryColor : secondaryColor,
    color: selectedItem.value === item ? 'black' : 'white',
    padding: 8,
  }));

const TableOfContentsElement = <T,>({
  item,
  index,
  visibleIndex,
  contentListRef,
}: {
  item: string;
  index: number;
  visibleIndex: SharedValue<number>;
  contentListRef: ContentListRef<T>;
}) => {
  const style = useSelectedStyle(visibleIndex, index);
  return (
    <Pressable
      onPress={() => {
        contentListRef.current?.scrollToIndex({ index, animated: true });
        visibleIndex.value = index;
      }}
      style={sectionListStyles.tableOfContentsElement}>
      <Animated.Text style={style}>{item}</Animated.Text>
    </Pressable>
  );
};

type TOCProps<T> = {
  selectedItem: SharedValue<string>;
  data: string[];
  visibleIndex: SharedValue<number>;
  contentListRef: ContentListRef<T>;
  tableOfContentsRef: TableOfContentsRef;
};

const TableOfContents = <T,>({
  data,
  visibleIndex,
  contentListRef,
  tableOfContentsRef,
}: TOCProps<T>) => {
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
            contentListRef={contentListRef}
          />
        )}
        data={data}
        estimatedItemSize={52}
        ref={tableOfContentsRef}
      />
    </View>
  );
};

type ContentProps<T> = {
  sections: {
    name: string;
    data: T;
  }[];
  renderItem: (item: T) => JSX.Element;
  visibleIndex: SharedValue<number>;
  contentListRef: ContentListRef<T>;
  tableOfContentsRef: TableOfContentsRef;
};

const Content = <T,>({
  sections,
  renderItem,
  visibleIndex,
  contentListRef,
  tableOfContentsRef,
}: ContentProps<T>) => {
  const heights = sections.map((_) => 0);

  const getOffsetStarts = () =>
    heights.map((v, i) => heights.slice(0, i).reduce((x, acc) => x + acc, 0));

  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offset = event.nativeEvent.contentOffset.y;

    const distancesFromTop = getOffsetStarts().map((v) => Math.abs(v - offset));
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
  };

  const renderMeasuredItem: ListRenderItem<Section<T>> = ({ item, index }) => {
    return (
      <View
        onLayout={({ nativeEvent }) => {
          heights[index] = nativeEvent.layout.height;
        }}>
        <Text style={sectionListStyles.sectionHeader}> {item.name}</Text>
        {renderItem(item.data)}
      </View>
    );
  };

  return (
    <View style={sectionListStyles.flex}>
      <FlashList
        ref={contentListRef}
        estimatedItemSize={100}
        estimatedFirstItemOffset={0}
        renderItem={renderMeasuredItem}
        data={sections}
        overrideItemLayout={(layout, item, index) => {
          layout.size = heights[index];
        }}
        onScrollBeginDrag={onScroll}
        onScrollEndDrag={onScroll}
        onScroll={debounce(onScroll)}
        onMomentumScrollBegin={onScroll}
        onMomentumScrollEnd={onScroll}
      />
    </View>
  );
};

const SectionList = <T,>(props: Props<T>) => {
  const selectedItem = useSharedValue('');
  const sectionNames = props.sections.map((s) => s.name);
  const visibleIndex = useSharedValue(0);
  const contentListRef = useRef<ContentList<T>>(null);
  const tableOfContentsRef = useRef<FlashList<string>>(null);

  return (
    <View style={styles.container}>
      <TableOfContents
        selectedItem={selectedItem}
        data={sectionNames}
        visibleIndex={visibleIndex}
        contentListRef={contentListRef}
        tableOfContentsRef={tableOfContentsRef}
      />
      <Content
        {...props}
        visibleIndex={visibleIndex}
        tableOfContentsRef={tableOfContentsRef}
        contentListRef={contentListRef}
      />
    </View>
  );
};

const sectionListStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: '#111',
  },
  flex: {
    flex: 1,
  },
  tableOfContentsElement: { margin: 8, borderRadius: 12, overflow: 'hidden' },
  sectionHeader: {
    textAlign: 'center',
    fontSize: 24,
    fontWeight: 'bold',
  },
  tableOfContents: {
    top: 0,
  },
});

const SCREEN_HEIGHT = Dimensions.get('screen').height;

const sections = Array(Math.floor(Math.random() * 10) + 4)
  .fill(0)
  .map((x, i) => ({ name: `Name ${i}`, data: `item ${i}` }));

const getRandomItemHeight = () =>
  Math.floor(Math.random() * (SCREEN_HEIGHT / 2) + SCREEN_HEIGHT / 3);

const ResizableItem = ({ children }: PropsWithChildren) => {
  const [height, setHeight] = useState(getRandomItemHeight());

  return (
    <Pressable onPress={() => setHeight(getRandomItemHeight())}>
      <View
        style={{
          margin: 16,
          backgroundColor: `#${Math.floor(
            Math.random() * 8388607 + 8388607
          ).toString(16)}`,
          height,
          justifyContent: 'center',
          alignItems: 'center',
          borderRadius: 24,
        }}>
        {children}
      </View>
    </Pressable>
  );
};

const renderItem = (data: string) => (
  <ResizableItem>
    <Text style={styles.text}>{data}</Text>
    <Text>(click me)</Text>
  </ResizableItem>
);

const SectionListScreen = () => {
  return (
    <View style={styles.container}>
      <SectionList sections={sections} renderItem={renderItem} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingTop: 24,
    height: 600,
  },
  text: {
    fontSize: 24,
  },
});

export default SectionListScreen;
