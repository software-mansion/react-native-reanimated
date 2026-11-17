import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import {
  LogBox,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import type {
  ProgressSharedTransitionAnimation,
  SharedTransitionAnimationsValues,
} from 'react-native-reanimated';
import Animated, {
  Easing,
  SharedTransition,
  SharedTransitionType,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Cake } from './cakes';
import { CAKES_BY_ID, formatPrice, SHOP_NAME } from './cakes';
import { colors, fonts, text } from './theme';
import {
  NoteChip,
  PrimaryButton,
  RoundButton,
  ScreenBoundary,
  useHiddenAppHeader,
} from './ui';

LogBox.ignoreAllLogs();

type Mode = 'arc' | 'swipe' | 'swipeAndTap';

const RECORDING = {
  mode: 'arc' as Mode,
  speed: 1,
};

const PHOTO_RADIUS = 24;
const SCREEN_PADDING = 20;
const GRID_GAP = 14;
const TILE_PADDING = 8;

type ParamList = {
  List: undefined;
  Details: { id: string };
};

const arc = SharedTransition.custom((v) => {
  'worklet';
  const time = { duration: 600 / RECORDING.speed };
  const rise = Easing.out(Easing.cubic);
  return {
    originX: withTiming(v.targetOriginX, time),
    originY: withTiming(v.targetOriginY, { ...time, easing: rise }),
    width: withTiming(v.targetWidth, time),
    height: withTiming(v.targetHeight, time),
  };
});

function lerpFrame(v: SharedTransitionAnimationsValues, p: number) {
  'worklet';
  const mix = (from: number, to: number) => from + (to - from) * p;
  return {
    originX: mix(v.currentOriginX, v.targetOriginX),
    originY: mix(v.currentOriginY, v.targetOriginY),
    width: mix(v.currentWidth, v.targetWidth),
    height: mix(v.currentHeight, v.targetHeight),
  };
}

const bulge: ProgressSharedTransitionAnimation = (v, p) => {
  'worklet';
  return {
    ...lerpFrame(v, p),
    borderRadius: PHOTO_RADIUS + 96 * Math.sin(Math.PI * p),
  };
};

const TRANSITIONS = {
  arc,
  swipe: SharedTransition.progressAnimation(bulge),
  swipeAndTap: SharedTransition.progressAnimation(bulge).defaultTransitionType(
    SharedTransitionType.PROGRESS_ANIMATION
  ),
};

const transition = TRANSITIONS[RECORDING.mode];

const GRID = [
  'confetti-cake',
  'raspberry-tart',
  'strawberry-cloud',
  'blueberry-tart',
  'lemon-tart',
  'cherry-cheesecake',
];

const SPECS = [
  { value: '4.9', label: 'rating' },
  { value: '8″', label: 'size' },
  { value: '10', label: 'slices' },
];

const Stack = createNativeStackNavigator<ParamList>();

export default function ControlSwipe() {
  useHiddenAppHeader();
  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false }}
      screenLayout={({ children }) => (
        <ScreenBoundary>{children}</ScreenBoundary>
      )}>
      <Stack.Screen name="List" component={ListScreen} />
      <Stack.Screen name="Details" component={DetailsScreen} />
    </Stack.Navigator>
  );
}

function ListScreen({ navigation }: NativeStackScreenProps<ParamList, 'List'>) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.screen, { paddingTop: insets.top + 8 }]}>
      <View style={styles.topBar}>
        <Text style={text.caption}>{SHOP_NAME}</Text>
        <RoundButton icon="bag" />
      </View>
      <Text style={[text.display, styles.headline]}>
        Fresh from{'\n'}the oven
      </Text>
      <View style={styles.grid}>
        {GRID.map((id) => (
          <Tile
            key={id}
            cake={CAKES_BY_ID[id]}
            onPress={() => navigation.navigate('Details', { id })}
          />
        ))}
      </View>
    </View>
  );
}

function Tile({ cake, onPress }: { cake: Cake; onPress: () => void }) {
  const { width } = useWindowDimensions();
  const tileWidth = (width - 2 * SCREEN_PADDING - GRID_GAP) / 2;
  const photoSize = tileWidth - 2 * TILE_PADDING;
  return (
    <Pressable onPress={onPress} style={[styles.tile, { width: tileWidth }]}>
      <Animated.Image
        source={cake.image}
        sharedTransitionTag={`swipe-photo-${cake.id}`}
        sharedTransitionStyle={transition}
        style={[styles.photo, { width: photoSize, height: photoSize }]}
      />
      <View style={styles.tileText}>
        <Text style={text.name} numberOfLines={1}>
          {cake.name}
        </Text>
        <Text style={text.price}>{formatPrice(cake.price)}</Text>
      </View>
    </Pressable>
  );
}

function DetailsScreen({
  route,
  navigation,
}: NativeStackScreenProps<ParamList, 'Details'>) {
  const insets = useSafeAreaInsets();
  const cake = CAKES_BY_ID[route.params.id];
  return (
    <View
      style={[
        styles.details,
        { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 8 },
      ]}>
      <View style={styles.topBar}>
        <RoundButton icon="back" onPress={() => navigation.goBack()} />
        <RoundButton icon="heart" color={colors.pink} />
      </View>
      <View style={styles.showcase}>
        <View style={styles.specs}>
          {SPECS.map(({ value, label }) => (
            <View key={label} style={styles.spec}>
              <Text style={styles.specValue}>{value}</Text>
              <Text style={styles.specLabel}>{label}</Text>
            </View>
          ))}
        </View>
        <Animated.Image
          source={cake.image}
          sharedTransitionTag={`swipe-photo-${cake.id}`}
          sharedTransitionStyle={transition}
          style={[styles.photo, styles.hero]}
        />
      </View>
      <View style={styles.titleRow}>
        <Text style={text.display}>{cake.name}</Text>
        <Text style={text.title}>{formatPrice(cake.price)}</Text>
      </View>
      <Text style={text.body} numberOfLines={3}>
        {cake.description}
      </Text>
      <View style={styles.notes}>
        {cake.notes.map((note) => (
          <NoteChip key={note} label={note} />
        ))}
      </View>
      <View style={styles.fill} />
      <PrimaryButton label={`Add · ${formatPrice(cake.price)}`} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: SCREEN_PADDING,
    gap: 14,
    backgroundColor: colors.cream,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headline: {
    marginBottom: 6,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_GAP,
  },
  tile: {
    padding: TILE_PADDING,
    borderRadius: PHOTO_RADIUS + TILE_PADDING,
    backgroundColor: colors.white,
  },
  photo: {
    borderRadius: PHOTO_RADIUS,
  },
  tileText: {
    gap: 2,
    paddingHorizontal: 6,
    paddingTop: 10,
    paddingBottom: 6,
  },
  details: {
    flex: 1,
    paddingHorizontal: SCREEN_PADDING,
    gap: 14,
    backgroundColor: colors.cream,
  },
  showcase: {
    flexDirection: 'row',
    gap: GRID_GAP,
    marginTop: 4,
    marginBottom: 4,
  },
  specs: {
    flex: 1,
    justifyContent: 'space-between',
  },
  spec: {
    height: 96,
    borderRadius: PHOTO_RADIUS + TILE_PADDING,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  specValue: {
    fontFamily: fonts.bold,
    fontSize: 22,
    color: colors.navy,
  },
  specLabel: {
    ...text.caption,
    fontSize: 11,
  },
  hero: {
    width: 236,
    height: 316,
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
  fill: {
    flex: 1,
  },
});
