import { useHeaderHeight } from '@react-navigation/elements';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import {
  LogBox,
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

import type { Cake } from './cakes';
import { CAKES_BY_ID, formatPrice, SHOP_NAME } from './cakes';
import { NATIVE_HEADER } from './nativeHeader';
import { colors, fonts, text } from './theme';
import {
  NoteChip,
  PrimaryButton,
  ScreenBoundary,
  Stars,
  useHiddenAppHeader,
} from './ui';

const RECORDING = {
  fadeContent: true,
  ownTags: true,
  fadeOutEnd: 1,
  fadeInDuration: undefined as number | undefined,
  entering: false,
  speed: 1,
};

const DURATION = 600 / RECORDING.speed;
const EASING = Easing.bezier(0.45, 0, 0.2, 1);
const PHOTO_TRANSITION = SharedTransition.duration(DURATION).easing(EASING);
const PRICE_TRANSITION = SharedTransition.duration(DURATION).easing(EASING);
const TILE_TRANSITION = RECORDING.fadeContent
  ? SharedTransition.duration(DURATION)
      .easing(EASING)
      .fadeContent({
        fadeOut: { end: RECORDING.fadeOutEnd },
        fadeIn: {
          duration:
            RECORDING.fadeInDuration === undefined
              ? undefined
              : RECORDING.fadeInDuration / RECORDING.speed,
        },
      })
  : SharedTransition.duration(DURATION).easing(EASING);
const BODY_ENTERING = RECORDING.entering
  ? FadeInDown.duration(500 / RECORDING.speed).easing(
      Easing.bezier(0.22, 1, 0.36, 1)
    )
  : undefined;

const SHELF = [
  'confetti-cake',
  'raspberry-tart',
  'blueberry-tart',
  'strawberry-cloud',
  'lemon-tart',
  'cherry-cheesecake',
].map((id) => CAKES_BY_ID[id]);

LogBox.ignoreAllLogs();

type ParamList = {
  Shop: undefined;
  Cake: { id: string };
};

const Stack = createNativeStackNavigator<ParamList>();

export default function ChildrenNative() {
  useHiddenAppHeader();
  return (
    <Stack.Navigator
      screenOptions={{
        ...NATIVE_HEADER,
      }}
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
              badge: { value: 2 },
              onPress: () => {},
            },
          ],
        }}
      />
      <Stack.Screen
        name="Cake"
        component={CakeScreen}
        options={{
          title: '',
          unstable_headerRightItems: () => [
            {
              type: 'button',
              label: 'Like',
              identifier: 'like',
              icon: { type: 'sfSymbol', name: 'heart' },
              tintColor: colors.pink,
              onPress: () => {},
            },
            {
              type: 'button',
              label: 'Share',
              identifier: 'share',
              icon: { type: 'sfSymbol', name: 'square.and.arrow.up' },
              onPress: () => {},
            },
          ],
        }}
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
        {SHELF.map((cake) => (
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
    <Pressable
      onPress={onPress}
      style={styles.tileSlot}
      accessibilityLabel={`Open ${cake.name}`}>
      <Animated.View
        sharedTransitionTag={`native-children-tile-${cake.id}`}
        sharedTransitionStyle={TILE_TRANSITION}
        style={[styles.tile, { backgroundColor: cake.tint }]}>
        <Text style={[text.name, styles.tileName]} numberOfLines={1}>
          {cake.name}
        </Text>
        <Photo cake={cake} style={styles.tilePhoto} />
        <Price cake={cake} />
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
        sharedTransitionTag={`native-children-tile-${cake.id}`}
        sharedTransitionStyle={TILE_TRANSITION}
        style={[styles.page, { backgroundColor: cake.tint }]}>
        <View style={styles.titleRow}>
          <Text style={text.display}>{cake.name}</Text>
          <Stars />
        </View>
        <Photo cake={cake} style={styles.hero} />
        <Animated.View entering={BODY_ENTERING} style={styles.body}>
          <Text style={text.body}>{cake.description}</Text>
          <View style={styles.notes}>
            {cake.notes.map((note) => (
              <NoteChip key={note} label={note} />
            ))}
          </View>
        </Animated.View>
        <View style={styles.footer}>
          <Price cake={cake} />
          <PrimaryButton label="Add to cart" style={styles.footerButton} />
        </View>
      </Animated.View>
    </View>
  );
}

function Photo({
  cake,
  style,
}: {
  cake: Cake;
  style: React.ComponentProps<typeof Animated.Image>['style'];
}) {
  return (
    <Animated.Image
      source={cake.image}
      sharedTransitionTag={
        RECORDING.ownTags ? `native-children-photo-${cake.id}` : undefined
      }
      sharedTransitionStyle={PHOTO_TRANSITION}
      style={style}
    />
  );
}

function Price({ cake }: { cake: Cake }) {
  return (
    <Animated.View
      sharedTransitionTag={
        RECORDING.ownTags ? `native-children-price-${cake.id}` : undefined
      }
      sharedTransitionStyle={PRICE_TRANSITION}
      style={styles.price}>
      <Text style={styles.priceLabel}>{formatPrice(cake.price)}</Text>
    </Animated.View>
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
    gap: 4,
    borderRadius: 28,
    overflow: 'hidden',
  },
  tileName: {
    marginTop: 4,
    marginHorizontal: 6,
  },
  tilePhoto: {
    width: '100%',
    height: 128,
    borderRadius: 20,
    marginTop: 6,
    marginBottom: 2,
  },
  price: {
    alignSelf: 'flex-start',
    marginTop: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.white,
  },
  priceLabel: {
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
    height: 300,
    borderRadius: 32,
  },
  body: {
    flex: 1,
    padding: 16,
    gap: 14,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
  },
  notes: {
    flexDirection: 'row',
    gap: 8,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 12,
  },
  footerButton: {
    flex: 1,
  },
});
