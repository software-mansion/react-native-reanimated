import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeOut,
  SharedTransition,
  SharedTransitionBoundary,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Cake } from './cakes';
import { CAKES, formatPrice, SHOP_NAME } from './cakes';
import { colors, fonts, shadow, text } from './theme';
import { NoteChip, PrimaryButton, Stars, useHiddenAppHeader } from './ui';

const TRANSITION = SharedTransition.springify(700).dampingRatio(0.72);
const CLOSE_DELAY = 700;

export default function BoundaryInPlace() {
  useHiddenAppHeader();
  const insets = useSafeAreaInsets();
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
      <SharedTransitionBoundary isActive={!isOpen}>
        <View style={styles.content}>
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
                    sharedTransitionTag={`in-place-${item.id}`}
                    sharedTransitionStyle={TRANSITION}
                    style={styles.bubble}
                  />
                </View>
                <Text style={styles.bubbleName} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={styles.bubblePrice}>
                  {formatPrice(item.price)}
                </Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.banner}>
            <Text style={styles.bannerTitle}>Free delivery today</Text>
            <Text style={styles.bannerText}>
              On every order over $30, warm from our oven to your door.
            </Text>
          </View>
        </View>
      </SharedTransitionBoundary>
      {cake && (
        <View style={StyleSheet.absoluteFill}>
          {isOpen && (
            <Animated.View
              entering={FadeIn.duration(300)}
              exiting={FadeOut.duration(350)}
              style={styles.backdrop}>
              <Pressable style={styles.fill} onPress={close} />
            </Animated.View>
          )}
          <SharedTransitionBoundary isActive={isOpen}>
            <View
              pointerEvents="box-none"
              style={[styles.overlay, { paddingBottom: insets.bottom + 16 }]}>
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
                  sharedTransitionTag={`in-place-${cake.id}`}
                  sharedTransitionStyle={TRANSITION}
                  style={styles.photo}
                />
                {isOpen && (
                  <Animated.View
                    entering={FadeInDown.delay(250).duration(400)}
                    exiting={FadeOut.duration(150)}
                    style={styles.details}>
                    <View style={styles.titleRow}>
                      <Text style={text.display}>{cake.name}</Text>
                      <Stars />
                    </View>
                    <Text style={styles.description} numberOfLines={3}>
                      {cake.description}
                    </Text>
                    <View style={styles.notes}>
                      {cake.notes.map((note) => (
                        <NoteChip key={note} label={note} />
                      ))}
                    </View>
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

const PHOTO_SIZE = 300;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  content: {
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
  bubblePrice: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.navySoft,
  },
  banner: {
    marginTop: 36,
    padding: 22,
    gap: 6,
    borderRadius: 30,
    backgroundColor: colors.navy,
  },
  bannerTitle: {
    fontFamily: fonts.bold,
    fontSize: 22,
    color: colors.yellow,
  },
  bannerText: {
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 21,
    color: colors.white,
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
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
  },
  card: {
    paddingTop: 20,
  },
  cardBackground: {
    ...StyleSheet.absoluteFill,
    borderRadius: 40,
    ...shadow,
  },
  photo: {
    width: PHOTO_SIZE,
    height: PHOTO_SIZE,
    alignSelf: 'center',
    borderRadius: 36,
    marginBottom: 20,
  },
  details: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  description: {
    ...text.body,
    color: colors.navy,
  },
  notes: {
    flexDirection: 'row',
    gap: 8,
  },
});
