import {
  FlashList,
  FlashListRef,
  ListRenderItem as FlashListRenderItem,
} from '@shopify/flash-list';
import React, { useCallback } from 'react';
import type {
  ListRenderItem as FlatListRenderItem,
  SectionListRenderItem,
} from 'react-native';
import {
  Button,
  ScrollView,
  SectionList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { SharedValue } from 'react-native-reanimated';
import Animated, {
  useAnimatedRef,
  useAnimatedStyle,
  useScrollOffset,
  useSharedValue,
} from 'react-native-reanimated';
import { ScrollView as RNGHScrollView } from 'react-native-gesture-handler';

const DATA = [...Array(100).keys()];

const AnimatedFlashList = Animated.createAnimatedComponent(FlashList<number>);
const AnimatedSectionList = Animated.createAnimatedComponent(
  SectionList<number>
);
const AnimatedRNGHScrollView = Animated.createAnimatedComponent(RNGHScrollView);

type ExampleProps = {
  offset: SharedValue<number>;
};

export default function ScrollViewOffsetExample() {
  const [currentExample, setCurrentExample] = React.useState(0);
  const offset = useSharedValue(0);

  useAnimatedStyle(() => {
    console.log(offset.value);
    return {};
  });

  const examples = [
    { title: 'ScrollView', component: ScrollViewExample },
    { title: 'FlatList', component: FlatListExample },
    { title: 'SectionList', component: SectionListExample },
    { title: 'FlashList', component: FlashListExample },
    { title: 'RNGHScrollView', component: RNGHScrollViewExample },
    {
      title: 'FlatList with custom renderer',
      component: FlatListWithCustomRendererExample,
    },
  ];

  const Example = examples[currentExample].component;

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.optionsRow}
        horizontal
        style={styles.optionsContainer}>
        {examples.map(({ title }, index) => (
          <Button
            disabled={index === currentExample}
            key={title}
            title={title}
            onPress={() => setCurrentExample(index)}
          />
        ))}
      </ScrollView>
      <View style={styles.positionView}>
        <Text>Check console for offset logs</Text>
      </View>
      <View style={styles.divider} />
      <Example key={currentExample} offset={offset} />
    </View>
  );
}

const ScrollViewExample = ({ offset }: ExampleProps) => {
  const aref = useAnimatedRef<Animated.ScrollView>();

  return (
    <Animated.ScrollView
      ref={aref}
      scrollViewOffset={offset}
      style={styles.scrollView}>
      {DATA.map((_, i) => (
        <Text key={i} style={styles.text}>
          {i}
        </Text>
      ))}
    </Animated.ScrollView>
  );
};

const FlatListExample = ({ offset }: ExampleProps) => {
  const aref = useAnimatedRef<Animated.FlatList<number>>();
  useScrollOffset(aref, offset);

  const renderItem = useCallback<FlatListRenderItem<number>>(
    ({ item }) => <Text style={styles.text}>{item}</Text>,
    []
  );

  return (
    <Animated.FlatList
      ref={aref}
      renderItem={renderItem}
      data={DATA}
      style={styles.scrollView}
    />
  );
};

const SectionListExample = ({ offset }: ExampleProps) => {
  const aref = useAnimatedRef<typeof AnimatedSectionList>();
  useScrollOffset(aref, offset);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const renderItem = useCallback<SectionListRenderItem<any>>(
    ({ item }) => <Text style={styles.text}>{item}</Text>,
    []
  );

  const sections = React.useMemo(
    () =>
      Array.from({ length: 10 }, (_, i) => ({
        title: `Section ${i + 1}`,
        data: DATA.slice(i * 10, (i + 1) * 10),
      })),
    []
  );

  return (
    <AnimatedSectionList
      ref={aref}
      renderItem={renderItem}
      style={styles.scrollView}
      sections={sections}
      renderSectionHeader={({ section: { title } }) => (
        <Text style={styles.header}>{title}</Text>
      )}
      stickySectionHeadersEnabled={false}
    />
  );
};

const FlashListExample = ({ offset }: ExampleProps) => {
  const aref = useAnimatedRef<FlashListRef<number>>();
  useScrollOffset(aref, offset);

  const renderItem = useCallback<FlashListRenderItem<number>>(
    ({ item }) => <Text style={styles.text}>{item}</Text>,
    []
  );

  return (
    <AnimatedFlashList
      ref={aref}
      renderItem={renderItem}
      data={DATA}
      style={styles.scrollView}
    />
  );
};

const FlatListWithCustomRendererExample = ({ offset }: ExampleProps) => {
  const aref = useAnimatedRef<Animated.FlatList<number>>();
  useScrollOffset(aref, offset);

  const renderItem = useCallback<FlatListRenderItem<number>>(
    ({ item }) => <Text style={styles.text}>{item}</Text>,
    []
  );

  return (
    <Animated.FlatList
      ref={aref}
      renderItem={renderItem}
      style={styles.scrollView}
      data={DATA}
      renderScrollComponent={CustomScrollComponent}
    />
  );
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomScrollComponent(props: any) {
  return <Animated.ScrollView {...props} />;
}

const RNGHScrollViewExample = ({ offset }: ExampleProps) => {
  const aref = useAnimatedRef<typeof AnimatedRNGHScrollView>();
  useScrollOffset(aref, offset);

  return (
    <AnimatedRNGHScrollView ref={aref} style={styles.scrollView}>
      {DATA.map((_, i) => (
        <Text key={i} style={styles.text}>
          {i}
        </Text>
      ))}
    </AnimatedRNGHScrollView>
  );
};

const styles = StyleSheet.create({
  optionsContainer: {
    flexGrow: 0,
  },
  optionsRow: {
    marginVertical: 10,
    fontSize: 10,
    gap: 3,
  },
  positionView: {
    margin: 20,
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
    width: '100%',
  },
  text: {
    fontSize: 50,
    textAlign: 'center',
  },
  header: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  divider: {
    backgroundColor: 'black',
    height: 1,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
