import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { LogBox, Pressable, StyleSheet, Text, View } from 'react-native';
import type {
  CustomSharedTransitionAnimation,
  SharedTransitionAnimationsValues,
} from 'react-native-reanimated';
import Animated, {
  Easing,
  SharedTransition,
  SharedTransitionType,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CAKES_BY_ID, formatPrice, SHOP_NAME } from './cakes';
import { colors, shadow, text } from './theme';
import {
  PrimaryButton,
  RoundButton,
  ScreenBoundary,
  Stars,
  useHiddenAppHeader,
} from './ui';

LogBox.ignoreAllLogs();

const RECORDING = {
  mode: 'lift' as 'lift' | 'sink' | 'sinkOnTap',
  speed: 1,
};

type ParamList = {
  Shop: undefined;
  Cake: undefined;
};

const CAKE = CAKES_BY_ID['raspberry-tart'];
const ALSO_TODAY = ['confetti-cake', 'blueberry-tart', 'berry-crown'].map(
  (id) => CAKES_BY_ID[id]
);

function scale(s: number) {
  'worklet';
  return [s, 0, 0, 0, 0, s, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
}

const lift: CustomSharedTransitionAnimation = (values) => {
  'worklet';
  const half = { duration: 350 * RECORDING.speed };
  return {
    originY: withTiming(values.targetOriginY, {
      duration: 700 * RECORDING.speed,
      easing: Easing.out(Easing.cubic),
    }),
    transform: [
      {
        matrix: withSequence(
          withTiming(scale(1.2), half),
          withTiming(scale(1), half)
        ),
      },
    ],
  };
};

const sink = (values: SharedTransitionAnimationsValues, progress: number) => {
  'worklet';
  const dip = 1 - 0.3 * Math.sin(Math.PI * progress);
  return {
    originY:
      values.currentOriginY +
      progress * (values.targetOriginY - values.currentOriginY),
    transform: [{ matrix: scale(dip) }],
  };
};

const OPEN = SharedTransition.duration(600);

const BACK = {
  lift: SharedTransition.custom(lift),
  sink: SharedTransition.progressAnimation(sink),
  sinkOnTap: SharedTransition.duration(700)
    .progressAnimation(sink)
    .defaultTransitionType(SharedTransitionType.PROGRESS_ANIMATION),
};

const back = BACK[RECORDING.mode];

const Stack = createNativeStackNavigator<ParamList>();

export default function ControlAlt() {
  useHiddenAppHeader();
  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false }}
      screenLayout={({ children }) => (
        <ScreenBoundary>{children}</ScreenBoundary>
      )}>
      <Stack.Screen name="Shop" component={ShopScreen} />
      <Stack.Screen
        name="Cake"
        component={CakeSheet}
        options={{
          presentation: 'formSheet',
          sheetAllowedDetents: [SHEET_DETENT],
          sheetGrabberVisible: true,
          sheetCornerRadius: 40,
          contentStyle: styles.sheet,
        }}
      />
    </Stack.Navigator>
  );
}

function ShopScreen({ navigation }: NativeStackScreenProps<ParamList, 'Shop'>) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        styles.screen,
        { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 8 },
      ]}>
      <View style={styles.topBar}>
        <Text style={text.caption}>{SHOP_NAME}</Text>
        <RoundButton icon="bag" />
      </View>
      <Text style={text.display}>Good morning</Text>
      <Text style={text.body}>
        Everything was baked before sunrise. When it is gone, it is gone.
      </Text>
      <Text style={[text.caption, styles.sectionTitle]}>Also today</Text>
      <View style={styles.alsoRow}>
        {ALSO_TODAY.map((cake) => (
          <View key={cake.id} style={styles.alsoItem}>
            <Animated.Image source={cake.image} style={styles.alsoPhoto} />
            <Text style={styles.alsoName} numberOfLines={1}>
              {cake.name}
            </Text>
          </View>
        ))}
      </View>
      <View style={styles.fill} />
      <Pressable
        onPress={() => navigation.navigate('Cake')}
        style={styles.card}>
        <Animated.Image
          source={CAKE.image}
          sharedTransitionTag="cake-of-the-day"
          sharedTransitionStyle={OPEN}
          style={styles.photo}
        />
        <View style={styles.cardRow}>
          <View>
            <Text style={text.caption}>Cake of the day</Text>
            <Text style={text.title}>{CAKE.name}</Text>
          </View>
          <Text style={text.title}>{formatPrice(CAKE.price)}</Text>
        </View>
      </Pressable>
    </View>
  );
}

function CakeSheet({ navigation }: NativeStackScreenProps<ParamList, 'Cake'>) {
  return (
    <View style={styles.sheetContent}>
      <RoundButton
        icon="close"
        onPress={() => navigation.goBack()}
        style={styles.close}
      />
      <Animated.Image
        source={CAKE.image}
        sharedTransitionTag="cake-of-the-day"
        sharedTransitionStyle={back}
        style={styles.photo}
      />
      <View style={styles.titleRow}>
        <Text style={text.title}>{CAKE.name}</Text>
        <Stars />
      </View>
      <Text style={text.body} numberOfLines={2}>
        {CAKE.description}
      </Text>
      <PrimaryButton
        label={`Add · ${formatPrice(CAKE.price)}`}
        style={styles.addButton}
      />
    </View>
  );
}

const SHEET_DETENT = 0.7;
const PHOTO_SIZE = 220;
const THUMB_SIZE = 108;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: 20,
    gap: 14,
    backgroundColor: colors.cream,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  card: {
    padding: 20,
    gap: 16,
    borderRadius: 36,
    backgroundColor: colors.white,
    alignItems: 'center',
    ...shadow,
  },
  photo: {
    width: PHOTO_SIZE,
    height: PHOTO_SIZE,
    borderRadius: 40,
  },
  cardRow: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    marginTop: 14,
  },
  alsoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  alsoItem: {
    width: THUMB_SIZE,
    gap: 8,
  },
  alsoPhoto: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: 24,
  },
  alsoName: {
    ...text.name,
    fontSize: 14,
  },
  fill: {
    flex: 1,
  },
  sheet: {
    backgroundColor: colors.cream,
  },
  sheetContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 36,
    paddingBottom: 40,
    gap: 12,
    alignItems: 'center',
  },
  close: {
    position: 'absolute',
    top: 20,
    right: 20,
  },
  titleRow: {
    alignSelf: 'stretch',
    marginTop: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  addButton: {
    alignSelf: 'stretch',
    marginTop: 'auto',
  },
});
