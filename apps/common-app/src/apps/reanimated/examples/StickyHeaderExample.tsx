import React, { useEffect, useState } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';
import Animated, {
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';

const BANNER_HEIGHT = 200;
const HEADER_HEIGHT = 60;
const ROW_COUNT = 500;
const ROWS = Array.from({ length: ROW_COUNT }, (_, index) => index);

export default function StickyHeaderExample() {
  const [synchronousHeader, setSynchronousHeader] = useState(true);
  const [reactCommits, setReactCommits] = useState(true);
  const offset = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler((event) => {
    offset.value = event.contentOffset.y;
  });

  const headerStyle = useAnimatedStyle(() => {
    const translateY = Math.max(0, offset.value - BANNER_HEIGHT);
    if (synchronousHeader) {
      return { transform: [{ translateY }] };
    }
    return {
      transform: [{ translateY }],
      width: `${80 + (offset.value % 100) / 5}%`,
    };
  }, [synchronousHeader]);

  return (
    <View style={styles.container}>
      <Toggle
        label="Synchronous header (transform only)"
        value={synchronousHeader}
        onValueChange={setSynchronousHeader}
      />
      <Toggle
        label="React commits (list batches and a counter)"
        value={reactCommits}
        onValueChange={setReactCommits}
      />
      <Text style={styles.hint}>
        With both switches on and the synchronous props flag on, the header
        jumped away from its pinned position while the list rendered new rows.
      </Text>
      <Animated.FlatList
        data={ROWS}
        keyExtractor={String}
        renderItem={renderRow}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        initialNumToRender={reactCommits ? 10 : ROW_COUNT}
        windowSize={reactCommits ? 3 : 21}
        maxToRenderPerBatch={reactCommits ? 4 : ROW_COUNT}
        removeClippedSubviews={false}
        ListHeaderComponent={
          <>
            <Banner counting={reactCommits} />
            <Animated.View style={[styles.header, headerStyle]}>
              <Text style={styles.headerText}>Sticky header</Text>
            </Animated.View>
          </>
        }
        ListHeaderComponentStyle={styles.listHeader}
      />
    </View>
  );
}

function renderRow({ item }: { item: number }) {
  return (
    <View style={styles.row}>
      <Text>Row {item}</Text>
    </View>
  );
}

interface ToggleProps {
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}

function Toggle({ label, value, onValueChange }: ToggleProps) {
  return (
    <View style={styles.toggle}>
      <Text style={styles.toggleLabel}>{label}</Text>
      <Switch value={value} onValueChange={onValueChange} />
    </View>
  );
}

function Banner({ counting }: { counting: boolean }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!counting) {
      return;
    }
    const interval = setInterval(() => setCount((value) => value + 1), 200);
    return () => clearInterval(interval);
  }, [counting]);

  return (
    <View style={styles.banner}>
      <Text style={styles.bannerText}>Banner</Text>
      {counting && <Text style={styles.bannerText}>{count}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  toggleLabel: {
    flex: 1,
  },
  hint: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    color: 'gray',
  },
  listHeader: {
    zIndex: 1,
  },
  banner: {
    height: BANNER_HEIGHT,
    backgroundColor: '#ffd166',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerText: {
    fontSize: 24,
  },
  header: {
    height: HEADER_HEIGHT,
    backgroundColor: '#001a72',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  headerText: {
    color: 'white',
    fontSize: 20,
  },
  row: {
    height: 64,
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'lightgray',
  },
});
