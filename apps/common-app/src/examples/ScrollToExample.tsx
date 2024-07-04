import type { AnimatedProps } from 'react-native-reanimated';
import Animated, {
  runOnUI,
  scrollTo,
  useAnimatedRef,
} from 'react-native-reanimated';
import type { ListRenderItem as FlatListRenderItem } from 'react-native';
import { Button, StyleSheet, Switch, Text, View } from 'react-native';

import React, { forwardRef, useCallback } from 'react';
import type {
  FlashListProps,
  ListRenderItem as FlashListRenderItem,
} from '@shopify/flash-list';
import { FlashList } from '@shopify/flash-list';

const DATA = [...Array(100).keys()];

const AnimatedFlashList = Animated.createAnimatedComponent(
  FlashList
) as React.ComponentClass<AnimatedProps<FlashListProps<number>>>;

export default function ScrollToExample() {
  const [currentExample, setCurrentExample] = React.useState(0);
  const [animated, setAnimated] = React.useState(true);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const aref = useAnimatedRef<any>();

  const scrollFromJS = () => {
    console.log(_WORKLET);
    aref.current?.scrollTo({ y: Math.random() * 2000, animated });
  };

  const scrollFromUI = () => {
    runOnUI(() => {
      console.log(_WORKLET);
      scrollTo(aref, 0, Math.random() * 2000, animated);
    })();
  };

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
        <Switch
          value={animated}
          onValueChange={setAnimated}
          style={styles.switch}
        />
        <Button onPress={scrollFromJS} title="Scroll from JS" />
        <Button onPress={scrollFromUI} title="Scroll from UI" />
      </View>
      <Example ref={aref} />
    </>
  );
}

const ScrollViewExample = forwardRef<Animated.ScrollView>((_, aref) => (
  <Animated.ScrollView ref={aref} style={styles.fill}>
    {DATA.map((_, i) => (
      <Text key={i} style={styles.text}>
        {i}
      </Text>
    ))}
  </Animated.ScrollView>
));

const FlatListExample = forwardRef<Animated.FlatList<number>>((_, aref) => {
  const renderItem = useCallback<FlatListRenderItem<number>>(
    ({ item }) => <Text style={styles.text}>{item}</Text>,
    []
  );

  return (
    <Animated.FlatList
      ref={aref as React.RefObject<Animated.FlatList<number>>}
      renderItem={renderItem}
      data={DATA}
      style={styles.fill}
    />
  );
});

const FlashListExample = forwardRef<Animated.FlatList<number>>((_, aref) => {
  const renderItem = useCallback<FlashListRenderItem<number>>(
    ({ item }) => <Text style={styles.text}>{item}</Text>,
    []
  );

  return (
    <AnimatedFlashList
      ref={aref as React.RefObject<FlashList<number>>}
      estimatedItemSize={60}
      renderItem={renderItem}
      data={DATA}
    />
  );
});

const styles = StyleSheet.create({
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },
  switch: {
    marginBottom: 10,
  },
  buttons: {
    marginTop: 80,
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
