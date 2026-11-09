import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  SharedTransition,
  SharedTransitionBoundary,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CATEGORIES, formatPrice, SHOP_NAME } from './cakes';
import { colors, fonts, text } from './theme';
import { PrimaryButton, RoundButton, Stars, useHiddenAppHeader } from './ui';

const TRANSITION = SharedTransition.springify(550).dampingRatio(0.9);
const CLOSE_DELAY = 600;

const MACARONS = CATEGORIES[0];
const PHOTOS = MACARONS.items.map((item) => ({
  id: item.name,
  image: item.image,
  caption: item.name,
}));

type Photo = (typeof PHOTOS)[number];

export default function BoundaryLightbox() {
  useHiddenAppHeader();
  const insets = useSafeAreaInsets();
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const open = (selected: Photo) => {
    setPhoto(selected);
    setIsOpen(true);
  };

  const close = () => {
    setIsOpen(false);
    setTimeout(() => setPhoto(null), CLOSE_DELAY);
  };

  return (
    <View style={styles.screen}>
      <SharedTransitionBoundary isActive={!isOpen}>
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 16 },
          ]}>
          <View style={styles.topBar}>
            <RoundButton icon="back" />
            <Text style={text.caption}>{SHOP_NAME}</Text>
            <RoundButton icon="heart" color={colors.pink} />
          </View>
          <Text style={[text.display, styles.title]}>Macaron{'\n'}Atelier</Text>
          <View style={styles.meta}>
            <Stars rating={4.9} />
            <Text style={styles.metaText}>· 1.2k reviews · 14 flavours</Text>
          </View>
          <Text style={text.body}>
            Almond shells, crisp outside and chewy inside, filled with ganache,
            fruit curd or buttercream. Baked in small batches every morning.
          </Text>
          <Text style={[text.caption, styles.galleryLabel]}>Gallery</Text>
          <View style={styles.gallery}>
            <Thumb photo={PHOTOS[0]} style={styles.thumbLarge} onPress={open} />
            <View style={styles.galleryColumn}>
              {PHOTOS.slice(1).map((item) => (
                <Thumb
                  key={item.id}
                  photo={item}
                  style={styles.thumbSmall}
                  onPress={open}
                />
              ))}
            </View>
          </View>
          <PrimaryButton
            label={`Box of 12 · ${formatPrice(MACARONS.items[0].price)}`}
            style={styles.buyButton}
          />
        </ScrollView>
      </SharedTransitionBoundary>
      <Modal
        visible={photo !== null}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={close}>
        {isOpen && (
          <Animated.View
            entering={FadeIn.duration(350)}
            exiting={FadeOut.duration(400)}
            style={styles.backdrop}
          />
        )}
        <SharedTransitionBoundary isActive={isOpen}>
          {photo && (
            <Pressable
              onPress={close}
              style={[
                styles.viewer,
                { paddingTop: insets.top, paddingBottom: insets.bottom },
              ]}>
              <Animated.Image
                source={photo.image}
                sharedTransitionTag={`lightbox-${photo.id}`}
                sharedTransitionStyle={TRANSITION}
                style={styles.fullPhoto}
              />
              {isOpen && (
                <Animated.View
                  entering={FadeIn.delay(300)}
                  exiting={FadeOut.duration(150)}
                  style={styles.captionRow}>
                  <Text style={styles.caption}>{photo.caption}</Text>
                  <Text style={styles.captionHint}>Tap to close</Text>
                </Animated.View>
              )}
            </Pressable>
          )}
        </SharedTransitionBoundary>
      </Modal>
    </View>
  );
}

function Thumb({
  photo,
  style,
  onPress,
}: {
  photo: Photo;
  style: React.ComponentProps<typeof Animated.Image>['style'];
  onPress: (photo: Photo) => void;
}) {
  return (
    <Pressable onPress={() => onPress(photo)}>
      <Animated.Image
        source={photo.image}
        sharedTransitionTag={`lightbox-${photo.id}`}
        sharedTransitionStyle={TRANSITION}
        style={style}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  content: {
    paddingHorizontal: 20,
    gap: 12,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    marginTop: 12,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.navySoft,
  },
  galleryLabel: {
    marginTop: 8,
  },
  gallery: {
    flexDirection: 'row',
    gap: 10,
  },
  galleryColumn: {
    flex: 1,
    gap: 10,
  },
  thumbLarge: {
    width: 220,
    height: 300,
    borderRadius: 28,
  },
  thumbSmall: {
    width: '100%',
    height: 93,
    borderRadius: 20,
  },
  buyButton: {
    marginTop: 12,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.ink,
  },
  viewer: {
    flex: 1,
    justifyContent: 'center',
  },
  fullPhoto: {
    width: '100%',
    height: 520,
  },
  captionRow: {
    paddingHorizontal: 24,
    paddingTop: 20,
    gap: 4,
  },
  caption: {
    fontFamily: fonts.bold,
    fontSize: 26,
    color: colors.white,
  },
  captionHint: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.peri,
  },
});
