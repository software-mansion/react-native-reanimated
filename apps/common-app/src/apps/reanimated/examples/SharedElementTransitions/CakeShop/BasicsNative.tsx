import { createNativeBottomTabNavigator } from '@react-navigation/bottom-tabs/unstable';
import { useHeaderHeight } from '@react-navigation/elements';
import { useIsFocused } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import {
  LogBox,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeOut,
  SharedTransition,
  SharedTransitionBoundary,
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

LogBox.ignoreAllLogs();

// 1 plays the app at normal speed. 4 records the 0.25x replay.
const SPEED = 1;

const TRANSITION = SharedTransition.duration(500 * SPEED);
const SHEET_TRANSITION = SharedTransition.duration(550);
const IN_PLACE_TRANSITION = SharedTransition.duration(550);
const CLOSE_DELAY = 600;

type ShopParamList = {
  Gallery: undefined;
  Details: { id: string };
  QuickLook: { id: string };
};

const Tabs = createNativeBottomTabNavigator();
const Stack = createNativeStackNavigator<ShopParamList>();

const QUICK_LOOK_IDS = [
  'strawberry-cloud',
  'cherry-cheesecake',
  'confetti-cake',
  'berry-crown',
  'lemon-tart',
];

const COLUMNS: { id: string; height: number }[][] = [
  [
    { id: 'raspberry-tart', height: 214 },
    { id: 'confetti-cake', height: 150 },
    { id: 'lemon-tart', height: 184 },
  ],
  [
    { id: 'blueberry-tart', height: 150 },
    { id: 'chocolate-layer', height: 214 },
    { id: 'berry-crown', height: 184 },
  ],
];

export default function BasicsNative() {
  useHiddenAppHeader();
  return (
    <Tabs.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.navy,
      }}>
      <Tabs.Screen
        name="Shop"
        component={ShopStack}
        options={{
          tabBarIcon: { type: 'sfSymbol', name: 'birthday.cake' },
        }}
      />
      <Tabs.Screen
        name="Treats"
        component={TreatsScreen}
        options={{
          tabBarIcon: { type: 'sfSymbol', name: 'sparkles' },
        }}
      />
    </Tabs.Navigator>
  );
}

function ShopStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        ...NATIVE_HEADER,
        contentStyle: styles.screen,
      }}
      screenLayout={({ children }) => (
        <ScreenBoundary>{children}</ScreenBoundary>
      )}>
      <Stack.Screen
        name="Gallery"
        component={GalleryScreen}
        options={{
          title: SHOP_NAME,
          headerLargeTitle: true,
          headerSearchBarOptions: {
            placeholder: 'Cakes, tarts, macarons',
            hideWhenScrolling: false,
          },
          unstable_headerRightItems: () => [
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
        name="Details"
        component={DetailsScreen}
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
          ],
        }}
      />
      <Stack.Screen
        name="QuickLook"
        component={QuickLookScreen}
        options={{
          presentation: 'formSheet',
          headerShown: false,
          sheetAllowedDetents: [0.62, 1],
          sheetGrabberVisible: true,
          contentStyle: styles.sheet,
        }}
      />
    </Stack.Navigator>
  );
}

function GalleryScreen({
  navigation,
}: NativeStackScreenProps<ShopParamList, 'Gallery'>) {
  return (
    <ScrollView
      style={styles.screen}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.galleryContent}>
      <Text style={[text.caption, styles.section]}>Quick look</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.quickRow}
        contentContainerStyle={styles.quickRowContent}>
        {QUICK_LOOK_IDS.map((id) => (
          <Pressable
            key={id}
            onPress={() => navigation.navigate('QuickLook', { id })}>
            <Animated.Image
              source={CAKES_BY_ID[id].image}
              sharedTransitionTag={`native-quick-${id}`}
              sharedTransitionStyle={SHEET_TRANSITION}
              style={styles.quickPhoto}
            />
          </Pressable>
        ))}
      </ScrollView>
      <Text style={[text.caption, styles.section]}>Baked this morning</Text>
      <View style={styles.grid}>
        {COLUMNS.map((column, index) => (
          <View key={index} style={styles.column}>
            {column.map(({ id, height }) => (
              <Tile
                key={id}
                cake={CAKES_BY_ID[id]}
                height={height}
                onPress={() => navigation.navigate('Details', { id })}
              />
            ))}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

function Tile({
  cake,
  height,
  onPress,
}: {
  cake: Cake;
  height: number;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.tile}>
      <Animated.Image
        source={cake.image}
        sharedTransitionTag={`native-${cake.id}`}
        sharedTransitionStyle={TRANSITION}
        style={[styles.tilePhoto, { height }]}
      />
      <View style={styles.tileLabel}>
        <Text style={styles.tileName} numberOfLines={1}>
          {cake.name}
        </Text>
        <Text style={styles.tilePrice}>{formatPrice(cake.price)}</Text>
      </View>
    </Pressable>
  );
}

function DetailsScreen({
  route,
}: NativeStackScreenProps<ShopParamList, 'Details'>) {
  const cake = CAKES_BY_ID[route.params.id];
  const headerHeight = useHeaderHeight();
  return (
    <View style={[styles.screen, { paddingTop: headerHeight + 8 }]}>
      <View style={styles.heroSlot}>
        <Animated.Image
          source={cake.image}
          sharedTransitionTag={`native-${cake.id}`}
          sharedTransitionStyle={TRANSITION}
          style={styles.hero}
        />
      </View>
      <Animated.View
        entering={FadeInDown.delay(150).duration(450)}
        style={styles.body}>
        <View style={styles.titleRow}>
          <Text style={[text.display, styles.title]}>{cake.name}</Text>
          <Stars />
        </View>
        <Text style={text.body}>{cake.description}</Text>
        <View style={styles.notes}>
          {cake.notes.map((note) => (
            <NoteChip key={note} label={note} />
          ))}
        </View>
        <PrimaryButton
          label={`Add to cart · ${formatPrice(cake.price)}`}
          style={styles.addButton}
        />
      </Animated.View>
    </View>
  );
}

function QuickLookScreen({
  route,
  navigation,
}: NativeStackScreenProps<ShopParamList, 'QuickLook'>) {
  const cake = CAKES_BY_ID[route.params.id];
  return (
    <View style={styles.quickLook}>
      <Animated.Image
        source={cake.image}
        sharedTransitionTag={`native-quick-${cake.id}`}
        sharedTransitionStyle={SHEET_TRANSITION}
        style={styles.sheetPhoto}
      />
      <View style={styles.titleRow}>
        <Text style={text.title}>{cake.name}</Text>
        <Stars />
      </View>
      <Text style={text.body} numberOfLines={2}>
        {cake.description}
      </Text>
      <PrimaryButton
        label={`Add to cart · ${formatPrice(cake.price)}`}
        onPress={() => navigation.goBack()}
      />
    </View>
  );
}

function TreatsScreen() {
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const [cake, setCake] = useState<Cake | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const open = (selected: Cake) => {
    setCake(selected);
    setIsOpen(true);
  };

  const close = () => {
    setIsOpen(false);
    setTimeout(() => setCake(null), CLOSE_DELAY);
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 12 }]}>
      <SharedTransitionBoundary isActive={isFocused && !isOpen}>
        <View style={styles.treats}>
          <Text style={text.caption}>{SHOP_NAME}</Text>
          <Text style={[text.display, styles.headline]}>
            Pick a little{'\n'}something
          </Text>
          <View style={styles.bubbles}>
            {CAKES.slice(0, 6).map((item) => (
              <Pressable
                key={item.id}
                onPress={() => open(item)}
                style={styles.bubbleSlot}>
                <View style={[styles.bubbleRing, { borderColor: item.tint }]}>
                  <Animated.Image
                    source={item.image}
                    sharedTransitionTag={`native-in-place-${item.id}`}
                    sharedTransitionStyle={IN_PLACE_TRANSITION}
                    style={styles.bubble}
                  />
                </View>
                <Text style={styles.bubbleName} numberOfLines={1}>
                  {item.name}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </SharedTransitionBoundary>
      {cake && (
        <View style={StyleSheet.absoluteFill}>
          {isOpen && (
            <Animated.View
              entering={FadeIn.duration(300)}
              exiting={FadeOut.duration(300)}
              style={styles.backdrop}>
              <Pressable style={styles.fill} onPress={close} />
            </Animated.View>
          )}
          <SharedTransitionBoundary isActive={isFocused && isOpen}>
            <View
              pointerEvents="box-none"
              style={[styles.overlay, { paddingTop: insets.top }]}>
              <View style={styles.card}>
                {isOpen && (
                  <Animated.View
                    entering={FadeIn.duration(300)}
                    exiting={FadeOut.duration(250)}
                    style={[
                      styles.cardBackground,
                      { backgroundColor: cake.tint },
                    ]}
                  />
                )}
                <Animated.Image
                  source={cake.image}
                  sharedTransitionTag={`native-in-place-${cake.id}`}
                  sharedTransitionStyle={IN_PLACE_TRANSITION}
                  style={styles.cardPhoto}
                />
                {isOpen && (
                  <Animated.View
                    entering={FadeInDown.delay(250).duration(400)}
                    exiting={FadeOut.duration(150)}
                    style={styles.cardDetails}>
                    <View style={styles.titleRow}>
                      <Text style={text.display}>{cake.name}</Text>
                      <Stars />
                    </View>
                    <Text style={styles.cardDescription} numberOfLines={3}>
                      {cake.description}
                    </Text>
                    <PrimaryButton
                      label={`Add · ${formatPrice(cake.price)}`}
                      onPress={close}
                    />
                  </Animated.View>
                )}
              </View>
            </View>
          </SharedTransitionBoundary>
        </View>
      )}
    </View>
  );
}

const GAP = 12;
const CARD_PHOTO_SIZE = 300;
const TAB_BAR_CLEARANCE = 80;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  galleryContent: {
    paddingHorizontal: 20,
    paddingBottom: 120,
  },
  section: {
    marginTop: 8,
    marginBottom: 12,
  },
  quickRow: {
    marginHorizontal: -20,
    marginBottom: 18,
  },
  quickRowContent: {
    paddingHorizontal: 20,
    gap: 12,
  },
  quickPhoto: {
    width: 84,
    height: 84,
    borderRadius: 42,
  },
  grid: {
    flexDirection: 'row',
    gap: GAP,
  },
  column: {
    flex: 1,
    gap: 16,
  },
  tile: {
    gap: 8,
  },
  tilePhoto: {
    width: '100%',
    borderRadius: 26,
  },
  tileLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingHorizontal: 4,
  },
  tileName: {
    flexShrink: 1,
    fontFamily: fonts.medium,
    fontSize: 15,
    color: colors.navy,
  },
  tilePrice: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.navySoft,
  },
  heroSlot: {
    paddingHorizontal: 16,
  },
  hero: {
    width: '100%',
    height: 340,
    borderRadius: 36,
  },
  body: {
    paddingHorizontal: 24,
    paddingTop: 22,
    gap: 14,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    flexShrink: 1,
  },
  notes: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  addButton: {
    marginTop: 10,
  },
  sheet: {
    backgroundColor: colors.cream,
  },
  quickLook: {
    paddingHorizontal: 20,
    paddingTop: 28,
    gap: 12,
  },
  sheetPhoto: {
    width: '100%',
    height: 300,
    borderRadius: 32,
  },
  treats: {
    paddingHorizontal: 20,
  },
  headline: {
    marginTop: 10,
    marginBottom: 28,
  },
  bubbles: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 26,
  },
  bubbleSlot: {
    width: '31%',
    alignItems: 'center',
    gap: 4,
  },
  bubbleRing: {
    padding: 4,
    marginBottom: 6,
    borderRadius: 60,
    borderWidth: 3,
  },
  bubble: {
    width: 96,
    height: 96,
    borderRadius: 48,
  },
  bubbleName: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.navy,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(13, 15, 38, 0.45)',
  },
  fill: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingBottom: TAB_BAR_CLEARANCE,
  },
  card: {
    paddingTop: 20,
  },
  cardBackground: {
    ...StyleSheet.absoluteFill,
    borderRadius: 40,
  },
  cardPhoto: {
    width: CARD_PHOTO_SIZE,
    height: CARD_PHOTO_SIZE,
    alignSelf: 'center',
    borderRadius: 36,
    marginBottom: 20,
  },
  cardDetails: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 12,
  },
  cardDescription: {
    ...text.body,
    color: colors.navy,
  },
});
