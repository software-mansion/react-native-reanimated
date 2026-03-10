import { useNavigation } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';

import { useCallback } from 'react';
import { Button, StyleSheet, Text, View } from 'react-native';
import Animated, {
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';

const Stack = createNativeStackNavigator();
const LIST_ITEM_COUNT = 80;

export default function AndroidDrawPassExample() {
  return (
    <View style={descriptionStyles.container}>
      <Stack.Navigator>
        <Stack.Screen name="Description" component={DescriptionScreen} />
        <Stack.Screen name="ScrollList" component={ScrollListScreen} />
      </Stack.Navigator>
    </View>
  );
}

function DescriptionScreen() {
  const navigation = useNavigation();

  return (
    <View style={descriptionStyles.centered}>
      <Text style={descriptionStyles.title}>Android Draw Pass Fix</Text>
      <Text style={descriptionStyles.description}>
        This example reproduces a bug that was fixed on Android where committing
        updates during a draw pass caused a crash.
      </Text>
      <Text style={descriptionStyles.description}>
        Previously, if you navigated to the scroll list and went back{' '}
        <Text style={descriptionStyles.bold}>while actively scrolling</Text>,
        the app would crash. This happened because Reanimated was attempting to
        commit UI updates while Android was in the middle of a draw pass, and
        sometimes React would have some hierarchy mutations queued up that would
        get bundled with these updates, triggering the crash.
      </Text>
      <Text style={descriptionStyles.description}>
        The fix detects when a draw pass is in progress and pushes only
        non-layout updates through the synchronous update path, while layout
        updates are deferred to the next frame. This ensures that we never
        attempt to mutate the view hierarchy during a draw pass.
      </Text>
      <Button
        title="Go to scroll list"
        onPress={() => navigation.navigate('ScrollList' as never)}
      />
    </View>
  );
}

function ListItem({ index }: { index: number }) {
  return (
    <View style={listStyles.listItem}>
      <Text>Item {index + 1}</Text>
      <Text style={listStyles.listItemSubtext}>
        Scroll fast and press Back — this used to crash on Android
      </Text>
    </View>
  );
}

function ScrollListScreen() {
  const scrollY = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  const floatingBadgeStyle = useAnimatedStyle(() => {
    const scale = interpolate(scrollY.value, [0, 100, 200], [1, 1.2, 0.9]);
    const rotate = interpolate(scrollY.value, [0, 150, 300], [0, 5, -5]);

    return {
      width: 100,
      transform: [{ scale }, { rotate: `${rotate}deg` }],
    };
  });

  const renderItem = useCallback(
    ({ item }: { item: number }) => <ListItem index={item} />,
    []
  );

  const keyExtractor = useCallback((item: number) => `item-${item}`, []);
  const data = Array.from({ length: LIST_ITEM_COUNT }, (_, index) => index);

  return (
    <View style={listStyles.container}>
      <Animated.View style={[listStyles.floatingBadge, floatingBadgeStyle]}>
        <Text style={listStyles.badgeText}>scrollY</Text>
      </Animated.View>

      <Animated.FlatList
        data={data}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        contentContainerStyle={listStyles.listContent}
        showsVerticalScrollIndicator
      />
    </View>
  );
}

const descriptionStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    gap: 16,
    padding: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  description: {
    color: '#333',
    fontSize: 15,
    lineHeight: 22,
  },
  bold: {
    fontWeight: '700',
  },
});

const listStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  floatingBadge: {
    position: 'absolute',
    top: 100,
    right: 20,
    zIndex: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 149, 0, 0.9)',
  },
  badgeText: {
    color: '#fff',
    fontWeight: '600',
  },
  listContent: {
    paddingTop: 24,
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  listItem: {
    marginBottom: 8,
    borderRadius: 8,
    paddingVertical: 16,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(128, 128, 128, 0.12)',
  },
  listItemSubtext: {
    marginTop: 6,
    opacity: 0.8,
  },
});
