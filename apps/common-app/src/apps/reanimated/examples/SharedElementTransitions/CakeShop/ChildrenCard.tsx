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
import Animated, { Easing, SharedTransition } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Cake } from './cakes';
import { CAKES_BY_ID, formatPrice, SHOP_NAME } from './cakes';
import { colors, fonts, text } from './theme';
import {
  NoteChip,
  PrimaryButton,
  RoundButton,
  ScreenBoundary,
  Stars,
  useHiddenAppHeader,
} from './ui';

const RECORDING = {
  fadeContent: true,
  ownTags: true,
  fadeOutEnd: 1,
  fadeInDuration: undefined as number | undefined,
  speed: 1,
};

const DURATION = 600 / RECORDING.speed;
const SCREEN_FADE = 350;
const EASING = Easing.bezier(0.45, 0, 0.2, 1);
const PHOTO_TRANSITION = SharedTransition.duration(DURATION).easing(EASING);
const PRICE_TRANSITION = SharedTransition.duration(DURATION).easing(EASING);
const CARD_TRANSITION = RECORDING.fadeContent
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

const MENU = ['chocolate-layer', 'berry-crown', 'cherry-cheesecake'].map(
  (id) => CAKES_BY_ID[id]
);

const PAGE_PHOTO_HEIGHT = 352;
const PAGE_PRICE_TOP = 4 + 56 + PAGE_PHOTO_HEIGHT + 22;

const FACTS = [
  { label: 'Serves', value: '10' },
  { label: 'Size', value: '8″' },
  { label: 'Baked', value: '6:00' },
];

LogBox.ignoreAllLogs();

type ParamList = {
  Menu: undefined;
  Cake: { id: string };
};

const Stack = createNativeStackNavigator<ParamList>();

export default function ChildrenCard() {
  useHiddenAppHeader();
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'fade',
        animationDuration: SCREEN_FADE,
      }}
      screenLayout={({ children }) => (
        <ScreenBoundary>{children}</ScreenBoundary>
      )}>
      <Stack.Screen name="Menu" component={MenuScreen} />
      <Stack.Screen name="Cake" component={CakeScreen} />
    </Stack.Navigator>
  );
}

function MenuScreen({ navigation }: NativeStackScreenProps<ParamList, 'Menu'>) {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.menu, { paddingTop: insets.top + 8 }]}>
      <View style={styles.topBar}>
        <Text style={text.caption}>{SHOP_NAME}</Text>
        <View style={styles.topBarButtons}>
          <RoundButton icon="search" />
          <RoundButton icon="bag" />
        </View>
      </View>
      <Text style={[text.display, styles.headline]}>Fresh from the oven</Text>
      {MENU.map((cake) => (
        <Card
          key={cake.id}
          cake={cake}
          onPress={() => navigation.navigate('Cake', { id: cake.id })}
        />
      ))}
    </ScrollView>
  );
}

function Card({ cake, onPress }: { cake: Cake; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityLabel={`Open ${cake.name}`}>
      <Animated.View
        sharedTransitionTag={`wide-card-${cake.id}`}
        sharedTransitionStyle={CARD_TRANSITION}
        style={[styles.card, { backgroundColor: cake.tint }]}>
        <Photo cake={cake} style={styles.cardPhoto} />
        <View style={styles.infoRow}>
          <View style={styles.infoText}>
            <Text style={text.title}>{cake.name}</Text>
            <Text style={styles.tagline}>{cake.tagline}</Text>
          </View>
        </View>
        <Price cake={cake} style={styles.cardPrice} />
      </Animated.View>
    </Pressable>
  );
}

function CakeScreen({
  route,
  navigation,
}: NativeStackScreenProps<ParamList, 'Cake'>) {
  const insets = useSafeAreaInsets();
  const cake = CAKES_BY_ID[route.params.id];
  return (
    <View style={styles.screen}>
      <Animated.View
        sharedTransitionTag={`wide-card-${cake.id}`}
        sharedTransitionStyle={CARD_TRANSITION}
        style={[
          styles.page,
          {
            backgroundColor: cake.tint,
            paddingTop: insets.top + 4,
            paddingBottom: insets.bottom + 6,
          },
        ]}>
        <View style={styles.pageButtons}>
          <RoundButton icon="back" onPress={() => navigation.goBack()} />
          <RoundButton icon="heart" color={colors.pink} />
        </View>
        <Photo cake={cake} style={styles.pagePhoto} />
        <View style={styles.infoRow}>
          <View style={styles.infoText}>
            <Text style={text.display}>{cake.name}</Text>
            <Text style={styles.tagline}>{cake.tagline}</Text>
          </View>
        </View>
        <Price
          cake={cake}
          style={[styles.pagePrice, { top: insets.top + PAGE_PRICE_TOP }]}
        />
        <View style={styles.body}>
          <Stars />
          <Text style={text.body}>{cake.description}</Text>
          <View style={styles.notes}>
            {cake.notes.map((note) => (
              <NoteChip key={note} label={note} />
            ))}
          </View>
          <View style={styles.facts}>
            {FACTS.map(({ label, value }) => (
              <View key={label} style={styles.fact}>
                <Text style={text.caption}>{label}</Text>
                <Text style={text.name}>{value}</Text>
              </View>
            ))}
          </View>
        </View>
        <PrimaryButton label="Add to cart" style={styles.addButton} />
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
        RECORDING.ownTags ? `wide-card-photo-${cake.id}` : undefined
      }
      sharedTransitionStyle={PHOTO_TRANSITION}
      style={style}
    />
  );
}

function Price({
  cake,
  style,
}: {
  cake: Cake;
  style: React.ComponentProps<typeof Animated.View>['style'];
}) {
  return (
    <Animated.View
      sharedTransitionTag={
        RECORDING.ownTags ? `wide-card-price-${cake.id}` : undefined
      }
      sharedTransitionStyle={PRICE_TRANSITION}
      style={[styles.price, style]}>
      <Text style={text.price}>{formatPrice(cake.price)}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  menu: {
    paddingHorizontal: 18,
    paddingBottom: 40,
    gap: 16,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topBarButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  headline: {
    marginTop: 4,
  },
  card: {
    padding: 10,
    borderRadius: 34,
    overflow: 'hidden',
  },
  cardPhoto: {
    width: '100%',
    height: 172,
    borderRadius: 26,
  },
  infoRow: {
    paddingLeft: 10,
    paddingRight: 120,
    paddingTop: 12,
    paddingBottom: 6,
  },
  infoText: {
    gap: 2,
  },
  tagline: {
    fontFamily: fonts.regular,
    fontSize: 15,
    color: colors.navySoft,
  },
  price: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: colors.white,
  },
  cardPrice: {
    position: 'absolute',
    right: 20,
    bottom: 21,
  },
  pagePrice: {
    position: 'absolute',
    right: 20,
  },
  page: {
    flex: 1,
    paddingHorizontal: 10,
    overflow: 'hidden',
  },
  pageButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 6,
    paddingBottom: 12,
  },
  pagePhoto: {
    width: '100%',
    height: PAGE_PHOTO_HEIGHT,
    borderRadius: 32,
  },
  body: {
    flex: 1,
    paddingHorizontal: 10,
    paddingTop: 10,
    gap: 14,
  },
  notes: {
    flexDirection: 'row',
    gap: 8,
  },
  facts: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  fact: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 22,
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ffffff73',
  },
  addButton: {
    marginHorizontal: 6,
  },
});
