import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  SharedTransition,
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
  Stars,
  useHiddenAppHeader,
} from './ui';

type ParamList = {
  Specials: undefined;
  Special: { id: string };
};

const EASING = Easing.inOut(Easing.cubic);
const CARD_TRANSITION = SharedTransition.duration(850)
  .easing(EASING)
  .fadeContent({ fadeOut: { end: 0.3 } });
const OWN_TRANSITION = SharedTransition.duration(850).easing(EASING);

const SPECIALS = [
  'confetti-cake',
  'berry-crown',
  'chocolate-layer',
  'cherry-cheesecake',
].map((id) => CAKES_BY_ID[id]);

const SEASON_LABELS = ['Birthday', 'Summer', 'Weekend', 'Classic'];
const PICKUP_DAYS = ['Today', 'Sat 8', 'Sun 9', 'Mon 10'];

const Stack = createNativeStackNavigator<ParamList>();

export default function FadeContentSpecials() {
  useHiddenAppHeader();
  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false }}
      screenLayout={({ children }) => (
        <ScreenBoundary>{children}</ScreenBoundary>
      )}>
      <Stack.Screen name="Specials" component={SpecialsScreen} />
      <Stack.Screen name="Special" component={SpecialScreen} />
    </Stack.Navigator>
  );
}

function SpecialsScreen({
  navigation,
}: NativeStackScreenProps<ParamList, 'Specials'>) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.screen, { paddingTop: insets.top + 12 }]}>
      <View style={styles.padded}>
        <Text style={text.caption}>{SHOP_NAME}</Text>
        <Text style={[text.display, styles.headline]}>
          This week’s{'\n'}specials
        </Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={CARD_WIDTH + CARD_GAP}
        decelerationRate="fast"
        style={styles.carouselScroll}
        contentContainerStyle={styles.carousel}>
        {SPECIALS.map((cake, index) => (
          <SpecialCard
            key={cake.id}
            cake={cake}
            label={SEASON_LABELS[index]}
            onPress={() => navigation.navigate('Special', { id: cake.id })}
          />
        ))}
      </ScrollView>
      <View style={[styles.padded, styles.footnote]}>
        <Text style={text.body}>
          Order by 6 pm, pick up warm the next morning.
        </Text>
      </View>
    </View>
  );
}

function SpecialCard({
  cake,
  label,
  onPress,
}: {
  cake: Cake;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress}>
      <Animated.View
        sharedTransitionTag={`special-${cake.id}`}
        sharedTransitionStyle={CARD_TRANSITION}
        style={[styles.card, { backgroundColor: cake.tint }]}>
        <Animated.Image
          source={cake.image}
          sharedTransitionTag={`special-photo-${cake.id}`}
          sharedTransitionStyle={OWN_TRANSITION}
          style={styles.cardPhoto}
        />
        <View style={styles.cardShade} />
        <View style={styles.badgeSlot}>
          <Badge cake={cake} label={label} />
        </View>
        <View style={styles.cardText}>
          <Text style={styles.cardName}>{cake.name}</Text>
          <Text style={styles.cardTagline}>{cake.tagline}</Text>
          <Text style={styles.cardPrice}>from {formatPrice(cake.price)}</Text>
        </View>
      </Animated.View>
    </Pressable>
  );
}

function Badge({ cake, label }: { cake: Cake; label: string }) {
  return (
    <Animated.View
      sharedTransitionTag={`special-badge-${cake.id}`}
      sharedTransitionStyle={OWN_TRANSITION}
      style={styles.badge}>
      <Text style={styles.badgeText}>{label}</Text>
    </Animated.View>
  );
}

function SpecialScreen({
  route,
  navigation,
}: NativeStackScreenProps<ParamList, 'Special'>) {
  const insets = useSafeAreaInsets();
  const index = SPECIALS.findIndex(({ id }) => id === route.params.id);
  const cake = SPECIALS[index];
  return (
    <View style={styles.detailScreen}>
      <Animated.View
        sharedTransitionTag={`special-${cake.id}`}
        sharedTransitionStyle={CARD_TRANSITION}
        style={styles.detailCard}>
        <Animated.Image
          source={cake.image}
          sharedTransitionTag={`special-photo-${cake.id}`}
          sharedTransitionStyle={OWN_TRANSITION}
          style={styles.detailPhoto}
        />
        <View style={[styles.detailTopBar, { top: insets.top + 8 }]}>
          <RoundButton icon="back" onPress={() => navigation.goBack()} />
          <Badge cake={cake} label={SEASON_LABELS[index]} />
        </View>
        <View style={styles.detailBody}>
          <View style={styles.titleRow}>
            <Text style={text.display}>{cake.name}</Text>
            <Stars rating={4.8} />
          </View>
          <Text style={text.body}>{cake.description}</Text>
          <Text style={[text.caption, styles.sectionLabel]}>Pick up</Text>
          <View style={styles.days}>
            {PICKUP_DAYS.map((day, dayIndex) => (
              <Animated.View
                key={day}
                entering={FadeIn.delay(dayIndex * 60)}
                style={[styles.day, dayIndex === 1 && styles.selectedDay]}>
                <Text
                  style={[
                    styles.dayText,
                    dayIndex === 1 && styles.selectedDayText,
                  ]}>
                  {day}
                </Text>
              </Animated.View>
            ))}
          </View>
          <View style={styles.notes}>
            {cake.notes.map((note) => (
              <NoteChip key={note} label={note} />
            ))}
          </View>
        </View>
        <View style={[styles.footer, { paddingBottom: insets.bottom + 8 }]}>
          <PrimaryButton label={`Order · ${formatPrice(cake.price)}`} />
        </View>
      </Animated.View>
    </View>
  );
}

const CARD_WIDTH = 270;
const CARD_GAP = 16;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  padded: {
    paddingHorizontal: 20,
  },
  headline: {
    marginTop: 10,
    marginBottom: 22,
  },
  carouselScroll: {
    flexGrow: 0,
  },
  carousel: {
    paddingHorizontal: 20,
    gap: CARD_GAP,
  },
  card: {
    width: CARD_WIDTH,
    height: 420,
    borderRadius: 36,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  cardPhoto: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  cardShade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 170,
    experimental_backgroundImage:
      'linear-gradient(to bottom, rgba(0,26,114,0), rgba(0,26,114,0.85))',
  },
  cardText: {
    padding: 22,
    gap: 4,
  },
  cardName: {
    fontFamily: fonts.bold,
    fontSize: 28,
    letterSpacing: -0.5,
    color: colors.white,
  },
  cardTagline: {
    fontFamily: fonts.regular,
    fontSize: 15,
    color: colors.white,
  },
  cardPrice: {
    marginTop: 8,
    fontFamily: fonts.medium,
    fontSize: 16,
    color: colors.yellow,
  },
  badgeSlot: {
    position: 'absolute',
    top: 18,
    left: 18,
  },
  badge: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.yellow,
  },
  badgeText: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.navy,
  },
  footnote: {
    marginTop: 24,
  },
  detailScreen: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  detailCard: {
    flex: 1,
    backgroundColor: colors.cream,
    overflow: 'hidden',
  },
  detailPhoto: {
    width: '100%',
    height: 440,
    borderBottomLeftRadius: 44,
    borderBottomRightRadius: 44,
  },
  detailTopBar: {
    position: 'absolute',
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  detailBody: {
    flex: 1,
    padding: 24,
    gap: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionLabel: {
    marginTop: 6,
  },
  days: {
    flexDirection: 'row',
    gap: 8,
  },
  day: {
    flex: 1,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  selectedDay: {
    backgroundColor: colors.navy,
  },
  dayText: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.navy,
  },
  selectedDayText: {
    color: colors.white,
  },
  notes: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  footer: {
    paddingHorizontal: 24,
  },
});
