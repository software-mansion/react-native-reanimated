import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import {
  LogBox,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import type { SharedTransitionAnimationsValues } from 'react-native-reanimated';
import Animated, {
  Easing,
  SharedTransition,
  SharedTransitionType,
  withTiming,
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
  transition: 'swipeOnTap' as 'rise' | 'swipe' | 'swipeOnTap',
  speed: 1,
};

const PHOTO_RADIUS = 24;

const DURATION = 900 / RECORDING.speed;

const rise = SharedTransition.custom((v) => {
  'worklet';
  const up = { duration: DURATION, easing: Easing.out(Easing.cubic) };
  const open = { duration: DURATION, easing: Easing.in(Easing.cubic) };
  return {
    originX: withTiming(v.targetOriginX, open),
    originY: withTiming(v.targetOriginY, up),
    width: withTiming(v.targetWidth, open),
    height: withTiming(v.targetHeight, open),
  };
});

const shape = (values: SharedTransitionAnimationsValues, progress: number) => {
  'worklet';
  const lerp = (from: number, to: number) => from + (to - from) * progress;
  return {
    originX: lerp(values.currentOriginX, values.targetOriginX),
    originY: lerp(values.currentOriginY, values.targetOriginY),
    width: lerp(values.currentWidth, values.targetWidth),
    height: lerp(values.currentHeight, values.targetHeight),
    borderRadius: 24 + 110 * Math.sin(progress * Math.PI),
  };
};

const TRANSITIONS = {
  rise,
  swipe: SharedTransition.duration(700).progressAnimation(shape),
  swipeOnTap: SharedTransition.duration(700)
    .progressAnimation(shape)
    .defaultTransitionType(SharedTransitionType.PROGRESS_ANIMATION),
};

const TRANSITION = TRANSITIONS[RECORDING.transition];

const SHELF = [
  'confetti-cake',
  'raspberry-tart',
  'blueberry-tart',
  'strawberry-cloud',
  'lemon-tart',
  'berry-crown',
].map((id) => CAKES_BY_ID[id]);

LogBox.ignoreAllLogs();

type ParamList = {
  Shop: undefined;
  Cake: { id: string };
};

const Stack = createNativeStackNavigator<ParamList>();

export default function ControlNative() {
  useHiddenAppHeader();
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
      contentContainerStyle={styles.shopContent}>
      {SHELF.map((cake) => (
        <Row
          key={cake.id}
          cake={cake}
          onPress={() => navigation.navigate('Cake', { id: cake.id })}
        />
      ))}
    </ScrollView>
  );
}

function Row({ cake, onPress }: { cake: Cake; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.row, { backgroundColor: cake.tint }]}
      accessibilityLabel={`Open ${cake.name}`}>
      <View style={styles.rowText}>
        <Text style={text.name} numberOfLines={1}>
          {cake.name}
        </Text>
        <Text style={styles.rowDescription} numberOfLines={2}>
          {cake.description}
        </Text>
        <Text style={styles.rowPrice}>{formatPrice(cake.price)}</Text>
      </View>
      <Photo cake={cake} style={styles.thumbnail} />
    </Pressable>
  );
}

function CakeScreen({ route }: NativeStackScreenProps<ParamList, 'Cake'>) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const cake = CAKES_BY_ID[route.params.id];
  const heroSize = width - 2 * SCREEN_PADDING;
  return (
    <ScrollView
      style={styles.screen}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={[
        styles.cakeContent,
        { paddingBottom: insets.bottom + 16 },
      ]}>
      <Photo cake={cake} style={{ width: heroSize, height: heroSize }} />
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
      <PrimaryButton
        label={`Add · ${formatPrice(cake.price)}`}
        style={styles.addButton}
      />
    </ScrollView>
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
      sharedTransitionTag={`native-control-${cake.id}`}
      sharedTransitionStyle={TRANSITION}
      style={[styles.photo, style]}
    />
  );
}

const SCREEN_PADDING = 20;
const ROW_GAP = 12;
const ROW_PADDING = 8;
const THUMBNAIL_SIZE = 112;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  shopContent: {
    paddingHorizontal: SCREEN_PADDING,
    paddingTop: 8,
    paddingBottom: 40,
    gap: ROW_GAP,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: ROW_PADDING,
    borderRadius: PHOTO_RADIUS + ROW_PADDING,
  },
  rowText: {
    flex: 1,
    paddingHorizontal: 10,
    gap: 4,
  },
  rowDescription: {
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors.navy,
    opacity: 0.7,
  },
  rowPrice: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: colors.navy,
  },
  thumbnail: {
    width: THUMBNAIL_SIZE,
    height: THUMBNAIL_SIZE,
  },
  photo: {
    borderRadius: PHOTO_RADIUS,
  },
  cakeContent: {
    paddingHorizontal: SCREEN_PADDING,
    paddingTop: 24,
    gap: 14,
  },
  titleRow: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  notes: {
    flexDirection: 'row',
    gap: 8,
  },
  addButton: {
    marginTop: 12,
  },
});
