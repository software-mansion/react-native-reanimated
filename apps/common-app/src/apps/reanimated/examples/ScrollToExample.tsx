import type {
  FlashListProps,
  ListRenderItem as FlashListRenderItem,
} from '@shopify/flash-list';
import { FlashList } from '@shopify/flash-list';
import type { Ref } from 'react';
import React, { useCallback, useImperativeHandle, useRef } from 'react';
import type { ListRenderItem as FlatListRenderItem } from 'react-native';
import { Button, StyleSheet, Switch, Text, View } from 'react-native';
import type { AnimatedProps } from 'react-native-reanimated';
import Animated, {
  runOnUI,
  scrollTo,
  useAnimatedRef,
} from 'react-native-reanimated';

const DATA = [...Array(100).keys()];

function getRandomOffset() {
  'worklet';
  return Math.random() * 2000;
}

const AnimatedFlashList = Animated.createAnimatedComponent(
  FlashList
) as React.ComponentClass<AnimatedProps<FlashListProps<number>>>;

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
      title: 'FlashList',
      component: FlashListExample,
    },
  ];

  const Example = examples[currentExample].component;

  return (
    <>
      <View style={styles.optionsRow}>
        {examples.map(({ title }, index) => (
          <Button
            disabled={index === currentExample}
            key={title}
            title={title}
            onPress={() => setCurrentExample(index)}
          />
        ))}
      </View>
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
      console.log(_WORKLET);
      aref.current?.scrollTo({ y: getRandomOffset(), animated });
    },
    scrollFromUI() {
      runOnUI(() => {
        console.log(_WORKLET);
        scrollTo(aref, 0, getRandomOffset(), animated);
      })();
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
      console.log(_WORKLET);
      aref.current?.scrollToOffset({ offset: getRandomOffset(), animated });
    },
    scrollFromUI() {
      runOnUI(() => {
        console.log(_WORKLET);
        scrollTo(aref, 0, getRandomOffset(), animated);
      })();
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
  const aref = useAnimatedRef<FlashList<number>>();

  useImperativeHandle(ref, () => ({
    scrollFromJS() {
      console.log(_WORKLET);
      aref.current?.scrollToOffset({ offset: getRandomOffset(), animated });
    },
    scrollFromUI() {
      runOnUI(() => {
        console.log(_WORKLET);
        scrollTo(aref, 0, getRandomOffset(), animated);
      })();
    },
  }));

  const renderItem = useCallback<FlashListRenderItem<number>>(
    ({ item }) => <Text style={styles.text}>{item}</Text>,
    []
  );

  return (
    <AnimatedFlashList
      ref={aref}
      estimatedItemSize={60}
      renderItem={renderItem}
      data={DATA}
    />
  );
};

const styles = StyleSheet.create({
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    marginVertical: 10,
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
});
