/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { useCallback } from 'react';
import type { FlatListProps } from 'react-native';
import { FlatList, View } from 'react-native';

import Animated from '../..';

function AnimatedFlatListTest() {
  function AnimatedFlatListTest1() {
    type Item = {
      id: number;
    };
    const AnimatedFlatList = Animated.createAnimatedComponent(FlatList);
    const AnimatedTypedFlatList =
      Animated.createAnimatedComponent<FlatListProps<Item[]>>(FlatList);
    const renderItem = useCallback(
      ({ item, index }: { item: Item[]; index: number }) => {
        if (Math.random()) {
          return null;
        }
        return <View style={{ width: 100 }} />;
      },
      []
    );
    return (
      <>
        <AnimatedTypedFlatList
          style={{ flex: 1 }}
          data={[]}
          renderItem={renderItem}
        />
        <AnimatedFlatList
          // @ts-expect-error
          style={{ flex: 1, red: false }}
          data={[]}
          renderItem={() => null}
        />
      </>
    );
  }

  function AnimatedFlatListTest2() {
    return (
      <>
        <Animated.FlatList
          data={[{ foo: 1 }]}
          renderItem={({ item, index }) => <View key={item.foo} />}
        />
      </>
    );
  }

  // This tests checks if the type of the contentContainerStyle
  // (or any other '...Style') is treated the same
  // as the style prop of the AnimatedFlatList.
  function AnimatedFlatListTest3() {
    const contentContainerStyle: React.ComponentProps<
      Animated.FlatList<unknown>
    >['contentContainerStyle'] = {};
    const newContentContainerStyle = [contentContainerStyle, { flex: 1 }];

    return (
      <Animated.FlatList
        data={[{ foo: 1 }]}
        renderItem={() => null}
        contentContainerStyle={newContentContainerStyle}
      />
    );
  }

  // This tests checks if the type of the contentContainerStyle
  // (or any other '...Style') is treated the same
  // as the style prop of the AnimatedFlatList.
  function AnimatedFlatListTest4() {
    const contentContainerStyle: React.ComponentProps<
      Animated.FlatList<unknown>
    >['style'] = {};
    return (
      <Animated.FlatList
        data={[{ foo: 1 }]}
        renderItem={() => null}
        contentContainerStyle={contentContainerStyle}
      />
    );
  }

  function AnimatedFlatListTestGenericParameterPresence() {
    return (
      <>
        <Animated.FlatList<string> data={['a', 'b']} renderItem={() => null} />
        {/* @ts-expect-error Properly detects wrong generic type */}
        <Animated.FlatList<string> data={[1, 2]} renderItem={() => null} />
      </>
    );
  }

  function AnimatedFlatListTestGenericParameterDefaultsToAny() {
    return (
      <>
        {/* @ts-expect-error Disable TypeScript item type inference */}
        <Animated.FlatList renderItem={({ item }) => item.absurdProperty} />
      </>
    );
  }
}
