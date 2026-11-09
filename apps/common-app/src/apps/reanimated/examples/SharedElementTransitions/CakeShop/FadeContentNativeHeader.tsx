import { useHeaderHeight } from '@react-navigation/elements';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  FadeInDown,
  SharedTransition,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Cake } from './cakes';
import { CAKES, CAKES_BY_ID, formatPrice, SHOP_NAME } from './cakes';
import { NATIVE_HEADER } from './nativeHeader';
import { colors, fonts, text } from './theme';
import {
  NoteChip,
  PrimaryButton,
  ScreenBoundary,
  Stars,
  useHiddenAppHeader,
} from './ui';

type ParamList = {
  Shop: undefined;
  Cake: { id: string };
};

const EASING = Easing.bezier(0.16, 1, 0.3, 1);
const TILE_TRANSITION = SharedTransition.duration(750)
  .easing(EASING)
  .fadeContent({ fadeIn: { duration: 300 } });
const OWN_TRANSITION = SharedTransition.duration(750).easing(EASING);

const Stack = createNativeStackNavigator<ParamList>();

export default function FadeContentNativeHeader() {
  useHiddenAppHeader();
  const [cart, setCart] = useState(2);
  const [liked, setLiked] = useState<string[]>([]);

  const toggleLike = (id: string) =>
    setLiked((ids) =>
      ids.includes(id) ? ids.filter((liked) => liked !== id) : [...ids, id]
    );

  return (
    <Stack.Navigator
      screenOptions={NATIVE_HEADER}
      screenLayout={({ children }) => (
        <ScreenBoundary>{children}</ScreenBoundary>
      )}>
      <Stack.Screen
        name="Shop"
        component={ShopScreen}
        options={{
          title: SHOP_NAME,
          headerLargeTitle: true,
          unstable_headerRightItems: () => [
            {
              type: 'button',
              label: 'Search',
              identifier: 'search',
              icon: { type: 'sfSymbol', name: 'magnifyingglass' },
              onPress: () => {},
            },
            {
              type: 'button',
              label: 'Cart',
              identifier: 'cart',
              icon: { type: 'sfSymbol', name: 'bag' },
              badge: { value: cart },
              onPress: () => {},
            },
          ],
        }}
      />
      <Stack.Screen
        name="Cake"
        component={CakeScreen}
        options={({ route }) => ({
          title: '',
          unstable_headerRightItems: () => [
            {
              type: 'button',
              label: 'Like',
              identifier: 'like',
              icon: {
                type: 'sfSymbol',
                name: liked.includes(route.params.id) ? 'heart.fill' : 'heart',
              },
              tintColor: colors.pink,
              onPress: () => toggleLike(route.params.id),
            },
            {
              type: 'button',
              label: 'Add',
              identifier: 'cart',
              icon: { type: 'sfSymbol', name: 'bag.badge.plus' },
              onPress: () => setCart((count) => count + 1),
            },
          ],
        })}
      />
    </Stack.Navigator>
  );
}

function ShopScreen({ navigation }: NativeStackScreenProps<ParamList, 'Shop'>) {
  return (
    <ScrollView
      style={styles.screen}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.content}>
      <Text style={[text.body, styles.intro]}>
        Small batches, baked before sunrise.
      </Text>
      <View style={styles.grid}>
        {CAKES.map((cake) => (
          <Tile
            key={cake.id}
            cake={cake}
            onPress={() => navigation.navigate('Cake', { id: cake.id })}
          />
        ))}
      </View>
    </ScrollView>
  );
}

function Tile({ cake, onPress }: { cake: Cake; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.tileSlot}>
      <Animated.View
        sharedTransitionTag={`native-tile-${cake.id}`}
        sharedTransitionStyle={TILE_TRANSITION}
        style={[styles.tile, { backgroundColor: cake.tint }]}>
        <Animated.Image
          source={cake.image}
          sharedTransitionTag={`native-photo-${cake.id}`}
          sharedTransitionStyle={OWN_TRANSITION}
          style={styles.tilePhoto}
        />
        <Text style={text.name} numberOfLines={1}>
          {cake.name}
        </Text>
        <Text style={styles.tilePrice}>{formatPrice(cake.price)}</Text>
      </Animated.View>
    </Pressable>
  );
}

function CakeScreen({ route }: NativeStackScreenProps<ParamList, 'Cake'>) {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const cake = CAKES_BY_ID[route.params.id];
  return (
    <View
      style={[
        styles.screen,
        styles.cakeScreen,
        { paddingTop: headerHeight + 8, paddingBottom: insets.bottom },
      ]}>
      <Animated.View
        sharedTransitionTag={`native-tile-${cake.id}`}
        sharedTransitionStyle={TILE_TRANSITION}
        style={[styles.page, { backgroundColor: cake.tint }]}>
        <Animated.Image
          source={cake.image}
          sharedTransitionTag={`native-photo-${cake.id}`}
          sharedTransitionStyle={OWN_TRANSITION}
          style={styles.hero}
        />
        <Animated.View
          entering={FadeInDown.duration(450).easing(EASING)}
          style={styles.body}>
          <View style={styles.titleRow}>
            <Text style={text.display}>{cake.name}</Text>
            <Stars />
          </View>
          <Text style={text.body}>{cake.description}</Text>
          <View style={styles.notes}>
            {cake.notes.map((note) => (
              <NoteChip key={note} label={note} />
            ))}
          </View>
        </Animated.View>
        <View style={styles.footer}>
          <Text style={styles.price}>{formatPrice(cake.price)}</Text>
          <PrimaryButton label="Add to cart" style={styles.footerButton} />
        </View>
      </Animated.View>
    </View>
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
  intro: {
    marginBottom: 16,
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
    padding: 10,
    gap: 6,
    borderRadius: 28,
    overflow: 'hidden',
  },
  tilePhoto: {
    width: '100%',
    height: 150,
    borderRadius: 20,
  },
  tilePrice: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: colors.navy,
  },
  cakeScreen: {
    paddingHorizontal: 12,
  },
  page: {
    flex: 1,
    padding: 8,
    borderRadius: 40,
    overflow: 'hidden',
  },
  hero: {
    width: '100%',
    height: 360,
    borderRadius: 32,
  },
  body: {
    flex: 1,
    padding: 24,
    gap: 14,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  notes: {
    flexDirection: 'row',
    gap: 8,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    padding: 16,
    paddingLeft: 24,
  },
  price: {
    fontFamily: fonts.bold,
    fontSize: 26,
    color: colors.navy,
  },
  footerButton: {
    flex: 1,
  },
});
