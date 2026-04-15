import {
  FlashList,
  FlashListRef,
  ListRenderItem as FlashListRenderItem,
} from '@shopify/flash-list';
import type { Ref } from 'react';
import React, { useCallback, useImperativeHandle, useRef } from 'react';
import type {
  ListRenderItem as FlatListRenderItem,
  SectionListRenderItem,
} from 'react-native';
import {
  Button,
  ScrollView,
  SectionList,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import Animated, { scrollTo, useAnimatedRef } from 'react-native-reanimated';
import { ScrollView as RNGHScrollView } from 'react-native-gesture-handler';
import { scheduleOnUI, getRuntimeKind } from 'react-native-worklets';

const DATA = [...Array(100).keys()];

function getRandomOffset() {
  'worklet';
  return Math.random() * 2000;
}

const AnimatedFlashList = Animated.createAnimatedComponent(FlashList<number>);

type Scrollable = {
  scrollFromJS: () => void;
  scrollFromUI: () => void;
};

export default function ScrollToExample() {
  const [currentExample, setCurrentExample] = React.useState(0);
  const [animated, setAnimated] = React.useState(true);

  const ref = useRef<Scrollable>(null);

  const examples = [
    {
      title: 'ScrollView',
      component: ScrollViewExample,
    },
    {
      title: 'FlatList',
      component: FlatListExample,
    },
    {
      title: 'SectionList',
      component: SectionListExample,
    },
    {
      title: 'FlashList',
      component: FlashListExample,
    },
    {
      title: 'RNGHScrollView',
      component: RNGHScrollViewExample,
    },
  ];

  const Example = examples[currentExample].component;

  return (
    <>
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
      <View style={styles.buttons}>
        <View style={styles.optionsRow}>
          <Text style={styles.switchLabel}>Animated</Text>
          <Switch value={animated} onValueChange={setAnimated} />
        </View>
        <Button
          onPress={() => ref.current?.scrollFromJS()}
          title="Scroll from JS"
        />
        <Button
          onPress={() => ref.current?.scrollFromUI()}
          title="Scroll from UI"
        />
      </View>
      <Example ref={ref} animated={animated} />
    </>
  );
}

type ExampleProps = {
  animated: boolean;
  ref: Ref<Scrollable>;
};

const ScrollViewExample = ({ animated, ref }: ExampleProps) => {
  const aref = useAnimatedRef<Animated.ScrollView>();

  useImperativeHandle(ref, () => ({
    scrollFromJS() {
      console.log(getRuntimeKind());
      aref.current?.scrollTo({ y: getRandomOffset(), animated });
    },
    scrollFromUI() {
      scheduleOnUI(() => {
        console.log(getRuntimeKind());
        scrollTo(aref, 0, getRandomOffset(), animated);
      });
    },
  }));

  return (
    <Animated.ScrollView ref={aref} style={styles.fill}>
      {DATA.map((_, i) => (
        <Text key={i} style={styles.text}>
          {i}
        </Text>
      ))}
    </Animated.ScrollView>
  );
};

const FlatListExample = ({ animated, ref }: ExampleProps) => {
  const aref = useAnimatedRef<Animated.FlatList<number>>();

  useImperativeHandle(ref, () => ({
    scrollFromJS() {
      console.log(getRuntimeKind());
      aref.current?.scrollToOffset({ offset: getRandomOffset(), animated });
    },
    scrollFromUI() {
      scheduleOnUI(() => {
        console.log(getRuntimeKind());
        scrollTo(aref, 0, getRandomOffset(), animated);
      });
    },
  }));

  const renderItem = useCallback<FlatListRenderItem<number>>(
    ({ item }) => <Text style={styles.text}>{item}</Text>,
    []
  );

  return (
    <Animated.FlatList
      ref={aref}
      renderItem={renderItem}
      data={DATA}
      style={styles.fill}
    />
  );
};

const FlashListExample = ({ animated, ref }: ExampleProps) => {
  const aref = useAnimatedRef<FlashListRef<number>>();

  useImperativeHandle(ref, () => ({
    scrollFromJS() {
      console.log(getRuntimeKind());
      aref.current?.scrollToOffset({ offset: getRandomOffset(), animated });
    },
    scrollFromUI() {
      scheduleOnUI(() => {
        console.log(getRuntimeKind());
        scrollTo(aref, 0, getRandomOffset(), animated);
      });
    },
  }));

  const renderItem = useCallback<FlashListRenderItem<number>>(
    ({ item }) => <Text style={styles.text}>{item}</Text>,
    []
  );

  return <AnimatedFlashList ref={aref} renderItem={renderItem} data={DATA} />;
};

const AnimatedSectionList = Animated.createAnimatedComponent(
  SectionList<number>
);

const SectionListExample = ({ animated, ref }: ExampleProps) => {
  const aref = useAnimatedRef<typeof AnimatedSectionList>();

  useImperativeHandle(ref, () => ({
    scrollFromJS() {
      console.log(getRuntimeKind());
      aref.current?.scrollToLocation({
        sectionIndex: Math.floor((Math.random() * DATA.length) / 10),
        itemIndex: Math.floor((Math.random() * DATA.length) / 10),
      });
    },
    scrollFromUI() {
      scheduleOnUI(() => {
        console.log(getRuntimeKind());
        scrollTo(aref, 0, getRandomOffset(), animated);
      });
    },
  }));

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
      style={styles.fill}
      sections={sections}
      renderSectionHeader={({ section: { title } }) => (
        <Text style={styles.header}>{title}</Text>
      )}
      stickySectionHeadersEnabled={false}
    />
  );
};

const AnimatedRNGHScrollView = Animated.createAnimatedComponent(RNGHScrollView);

const RNGHScrollViewExample = ({ animated, ref }: ExampleProps) => {
  const aref = useAnimatedRef<typeof AnimatedRNGHScrollView>();

  useImperativeHandle(ref, () => ({
    scrollFromJS() {
      console.log(getRuntimeKind());
      // @ts-ignore This is broken with react-native-strict-api types.

      aref.current?.scrollTo({ y: getRandomOffset(), animated });
    },
    scrollFromUI() {
      scheduleOnUI(() => {
        console.log(getRuntimeKind());
        scrollTo(aref, 0, getRandomOffset(), animated);
      });
    },
  }));

  return (
    <AnimatedRNGHScrollView ref={aref} style={styles.fill}>
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
  switchLabel: {
    fontSize: 20,
  },
  buttons: {
    marginTop: 20,
    marginBottom: 40,
    alignItems: 'center',
  },
  fill: {
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
});
