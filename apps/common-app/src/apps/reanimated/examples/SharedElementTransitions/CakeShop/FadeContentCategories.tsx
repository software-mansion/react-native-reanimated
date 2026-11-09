import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  Easing,
  FadeInDown,
  SharedTransition,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Category } from './cakes';
import { CATEGORIES, formatPrice, SHOP_NAME } from './cakes';
import { colors, fonts, shadow, text } from './theme';
import { Icon, RoundButton, ScreenBoundary, useHiddenAppHeader } from './ui';

type ParamList = {
  Categories: undefined;
  Category: { id: string };
};

const EASING = Easing.bezier(0.25, 1, 0.5, 1);
const TILE_TRANSITION = SharedTransition.duration(550)
  .easing(EASING)
  .fadeContent({ fadeOut: { end: 0.4 }, fadeIn: { duration: 200 } });
const OWN_TRANSITION = SharedTransition.duration(550).easing(EASING);

const TITLE_SIZE = 40;
const TILE_TITLE_SCALE = 0.55;

const Stack = createNativeStackNavigator<ParamList>();

export default function FadeContentCategories() {
  useHiddenAppHeader();
  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false }}
      screenLayout={({ children }) => (
        <ScreenBoundary>{children}</ScreenBoundary>
      )}>
      <Stack.Screen name="Categories" component={CategoriesScreen} />
      <Stack.Screen name="Category" component={CategoryScreen} />
    </Stack.Navigator>
  );
}

function CategoriesScreen({
  navigation,
}: NativeStackScreenProps<ParamList, 'Categories'>) {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 12 }]}>
      <Text style={text.caption}>{SHOP_NAME}</Text>
      <Text style={[text.display, styles.headline]}>
        What are you{'\n'}craving today?
      </Text>
      <View style={styles.grid}>
        {CATEGORIES.map((category) => (
          <CategoryTile
            key={category.id}
            category={category}
            onPress={() => navigation.navigate('Category', { id: category.id })}
          />
        ))}
      </View>
    </ScrollView>
  );
}

function CategoryTile({
  category,
  onPress,
}: {
  category: Category;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.tileSlot}>
      <Animated.View
        sharedTransitionTag={`category-${category.id}`}
        sharedTransitionStyle={TILE_TRANSITION}
        style={[styles.tile, { backgroundColor: category.tint }]}>
        <Animated.Image
          source={category.image}
          sharedTransitionTag={`category-photo-${category.id}`}
          sharedTransitionStyle={OWN_TRANSITION}
          style={styles.tilePhoto}
        />
        <CategoryTitle category={category} scale={TILE_TITLE_SCALE} />
        <View style={styles.tileFooter}>
          <Text style={styles.count}>{category.count} treats</Text>
          <View style={styles.tileArrow}>
            <Icon name="arrow" size={16} />
          </View>
        </View>
      </Animated.View>
    </Pressable>
  );
}

function CategoryTitle({
  category,
  scale,
}: {
  category: Category;
  scale: number;
}) {
  return (
    <Animated.Text
      sharedTransitionTag={`category-title-${category.id}`}
      sharedTransitionStyle={OWN_TRANSITION}
      style={[
        styles.categoryTitle,
        { transform: [{ scale }], marginBottom: (scale - 1) * TITLE_SIZE },
      ]}
      numberOfLines={1}>
      {category.name}
    </Animated.Text>
  );
}

function CategoryScreen({
  route,
  navigation,
}: NativeStackScreenProps<ParamList, 'Category'>) {
  const insets = useSafeAreaInsets();
  const category =
    CATEGORIES.find(({ id }) => id === route.params.id) ?? CATEGORIES[0];
  return (
    <ScrollView style={styles.screen} bounces={false}>
      <Animated.View
        sharedTransitionTag={`category-${category.id}`}
        sharedTransitionStyle={TILE_TRANSITION}
        style={[
          styles.header,
          { backgroundColor: category.tint, paddingTop: insets.top + 8 },
        ]}>
        <View style={styles.headerBar}>
          <RoundButton icon="back" onPress={() => navigation.goBack()} />
          <RoundButton icon="search" />
        </View>
        <Animated.Image
          source={category.image}
          sharedTransitionTag={`category-photo-${category.id}`}
          sharedTransitionStyle={OWN_TRANSITION}
          style={styles.headerPhoto}
        />
        <CategoryTitle category={category} scale={1} />
        <Text style={styles.headerCount}>
          {category.count} treats · baked fresh every morning
        </Text>
      </Animated.View>
      <View style={styles.items}>
        {category.items.map((item, index) => (
          <Animated.View
            key={item.name}
            entering={FadeInDown.delay(250 + index * 70).duration(450)}
            style={styles.item}>
            <Image source={item.image} style={styles.itemPhoto} />
            <Text style={text.name}>{item.name}</Text>
            <View style={styles.itemFooter}>
              <Text style={text.price}>{formatPrice(item.price)}</Text>
              <View style={styles.itemAdd}>
                <Icon name="plus" size={18} color={colors.white} />
              </View>
            </View>
          </Animated.View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  headline: {
    marginTop: 10,
    marginBottom: 22,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 14,
  },
  tileSlot: {
    width: '48%',
  },
  tile: {
    height: 210,
    padding: 14,
    borderRadius: 30,
    overflow: 'hidden',
  },
  tilePhoto: {
    width: 96,
    height: 96,
    borderRadius: 48,
    marginBottom: 14,
  },
  categoryTitle: {
    width: 320,
    fontFamily: fonts.bold,
    fontSize: TITLE_SIZE,
    letterSpacing: -1,
    color: colors.navy,
    transformOrigin: 'left top',
  },
  tileFooter: {
    marginTop: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  count: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.navy,
  },
  tileArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  header: {
    height: 470,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 44,
    borderBottomRightRadius: 44,
    overflow: 'hidden',
  },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  headerPhoto: {
    width: 220,
    height: 220,
    borderRadius: 110,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 20,
  },
  headerCount: {
    marginTop: 6,
    fontFamily: fonts.regular,
    fontSize: 16,
    color: colors.navy,
  },
  items: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    padding: 20,
    rowGap: 14,
  },
  item: {
    width: '48%',
    padding: 10,
    gap: 8,
    borderRadius: 26,
    backgroundColor: colors.white,
    ...shadow,
  },
  itemPhoto: {
    width: '100%',
    height: 150,
    borderRadius: 18,
  },
  itemFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  itemAdd: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.navy,
  },
});
