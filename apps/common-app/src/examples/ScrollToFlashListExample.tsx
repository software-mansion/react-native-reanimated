import type { AnimatedProps } from 'react-native-reanimated';
import Animated, {
  runOnUI,
  scrollTo,
  useAnimatedRef,
} from 'react-native-reanimated';
import { Button, StyleSheet, Switch, Text, View } from 'react-native';
import type { FlashListProps, ListRenderItem } from '@shopify/flash-list';
import { FlashList } from '@shopify/flash-list';

import React, { useCallback } from 'react';

const AnimatedFlashList = Animated.createAnimatedComponent(
  FlashList
) as React.ComponentClass<AnimatedProps<FlashListProps<number>>>;

export default function ScrollToFlashListExample() {
  const [animated, setAnimated] = React.useState(true);

  const aref = useAnimatedRef<Animated.FlatList<number>>();

  const scrollFromJS = () => {
    console.log(_WORKLET);
    aref.current?.scrollToOffset({ offset: Math.random() * 2000, animated });
  };

  const scrollFromUI = () => {
    runOnUI(() => {
      console.log(_WORKLET);
      scrollTo(aref, 0, Math.random() * 2000, animated);
    })();
  };

  const renderItem = useCallback<ListRenderItem<number>>(
    ({ item }) => (
      <View style={styles.cell}>
        <Text style={styles.text}>{item}</Text>
      </View>
    ),
    []
  );

  return (
    <>
      <View style={styles.buttons}>
        <Switch
          value={animated}
          onValueChange={setAnimated}
          style={styles.switch}
        />
        <Button onPress={scrollFromJS} title="Scroll from JS" />
        <Button onPress={scrollFromUI} title="Scroll from UI" />
      </View>
      <AnimatedFlashList
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ref={aref as any}
        estimatedItemSize={60}
        renderItem={renderItem}
        data={[...Array(100).keys()]}
      />
    </>
  );
}

const styles = StyleSheet.create({
  switch: {
    marginBottom: 10,
  },
  buttons: {
    marginTop: 80,
    marginBottom: 40,
    alignItems: 'center',
  },
  cell: {
    height: 60,
  },
  text: {
    fontSize: 50,
    textAlign: 'center',
  },
});
