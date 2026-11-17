import React, { useState } from 'react';
import type { ImageSourcePropType } from 'react-native';
import { LogBox, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  SharedTransition,
  SharedTransitionBoundary,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import eclairs from '../assets/cake-shop/eclairs.jpg';
import fruitTart from '../assets/cake-shop/fruit-tart.jpg';
import pinkCupcake from '../assets/cake-shop/pink-cupcake.jpg';
import raspberryMacarons from '../assets/cake-shop/raspberry-macarons.jpg';
import { formatPrice, SHOP_NAME } from './cakes';
import { colors, fonts, shadow, text } from './theme';
import {
  Icon,
  NoteChip,
  PrimaryButton,
  RoundButton,
  useHiddenAppHeader,
} from './ui';

const RECORDING = {
  ownTags: true,
  fadeOutEnd: undefined as number | undefined,
  fadeInDuration: undefined as number | undefined,
  speed: 1,
};

const DURATION = 500 / RECORDING.speed;
const BACKDROP_FADE = 300;
const UNMOUNT_DELAY = 2 * DURATION + 200;
const EASING = Easing.bezier(0.45, 0, 0.2, 1);
const THUMB_TRANSITION = SharedTransition.duration(DURATION).easing(EASING);
const COUNTER_TRANSITION = SharedTransition.duration(DURATION).easing(EASING);
const TO_PANEL = SharedTransition.duration(DURATION)
  .easing(EASING)
  .fadeContent({
    fadeOut: { end: RECORDING.fadeOutEnd },
    fadeIn: {
      duration:
        RECORDING.fadeInDuration === undefined
          ? undefined
          : RECORDING.fadeInDuration / RECORDING.speed,
    },
  });
const TO_ROW = SharedTransition.duration(DURATION)
  .easing(EASING)
  .fadeContent({ fadeOut: { end: 0.3 } });

type Item = {
  id: string;
  name: string;
  detail: string;
  description: string;
  price: number;
  quantity: number;
  image: ImageSourcePropType;
  tint: string;
  notes: string[];
};

const BAG: Item[] = [
  {
    id: 'pink-velvet',
    name: 'Pink Velvet',
    detail: 'Cupcake',
    description:
      'Red velvet sponge under a tall swirl of raspberry buttercream, piped to order.',
    price: 5,
    quantity: 2,
    image: pinkCupcake,
    tint: colors.pinkSoft,
    notes: ['Raspberry', 'Buttercream'],
  },
  {
    id: 'raspberry-rose',
    name: 'Raspberry Rose',
    detail: 'Macarons, box of 6',
    description:
      'Almond shells with rose water ganache and a fresh raspberry centre.',
    price: 14,
    quantity: 1,
    image: raspberryMacarons,
    tint: colors.purple,
    notes: ['Almond', 'Rose', 'Raspberry'],
  },
  {
    id: 'eclair-trio',
    name: 'Éclair Trio',
    detail: 'Vanilla, berry, pistachio',
    description:
      'Choux pastry filled with three creams and glazed in pastel fondant.',
    price: 9,
    quantity: 1,
    image: eclairs,
    tint: colors.peri,
    notes: ['Choux', 'Vanilla', 'Pistachio'],
  },
  {
    id: 'fruit-garden',
    name: 'Fruit Garden',
    detail: 'Tart, 8″',
    description:
      'Shortcrust with vanilla cream, kiwi, berries and a light apricot glaze.',
    price: 32,
    quantity: 1,
    image: fruitTart,
    tint: colors.green,
    notes: ['Shortcrust', 'Berries', 'Kiwi'],
  },
];

const TOTAL = BAG.reduce((sum, item) => sum + item.price * item.quantity, 0);

LogBox.ignoreAllLogs();

export default function ChildrenAlt() {
  useHiddenAppHeader();
  const insets = useSafeAreaInsets();
  const [openId, setOpenId] = useState<string | null>(null);
  const [panelId, setPanelId] = useState<string | null>(null);
  const panelItem = BAG.find((item) => item.id === panelId);

  const open = (id: string) => {
    setPanelId(id);
    setOpenId(id);
  };

  const close = () => {
    setOpenId(null);
    setTimeout(() => setPanelId(null), UNMOUNT_DELAY);
  };

  return (
    <View style={styles.screen}>
      <SharedTransitionBoundary isActive={openId === null}>
        <Bag topInset={insets.top} bottomInset={insets.bottom} onOpen={open} />
      </SharedTransitionBoundary>
      <Backdrop isVisible={openId !== null} onPress={close} />
      {panelItem && (
        <SharedTransitionBoundary isActive={openId !== null}>
          <View
            pointerEvents="box-none"
            style={[styles.panelSlot, { paddingBottom: insets.bottom + 8 }]}>
            <Panel item={panelItem} onClose={close} />
          </View>
        </SharedTransitionBoundary>
      )}
    </View>
  );
}

function Backdrop({
  isVisible,
  onPress,
}: {
  isVisible: boolean;
  onPress: () => void;
}) {
  const fadeStyle = useAnimatedStyle(() => ({
    opacity: withTiming(isVisible ? 1 : 0, { duration: BACKDROP_FADE }),
  }));
  return (
    <Animated.View
      pointerEvents={isVisible ? 'auto' : 'none'}
      style={[styles.backdrop, fadeStyle]}>
      <Pressable style={styles.fill} onPress={onPress} />
    </Animated.View>
  );
}

function Bag({
  topInset,
  bottomInset,
  onOpen,
}: {
  topInset: number;
  bottomInset: number;
  onOpen: (id: string) => void;
}) {
  return (
    <View
      style={[
        styles.bag,
        { paddingTop: topInset + 8, paddingBottom: bottomInset + 8 },
      ]}>
      <View style={styles.topBar}>
        <Text style={text.caption}>{SHOP_NAME}</Text>
        <RoundButton icon="heart" color={colors.pink} />
      </View>
      <Text style={[text.display, styles.headline]}>Your bag</Text>
      <View style={styles.rows}>
        {BAG.map((item) => (
          <Row key={item.id} item={item} onPress={() => onOpen(item.id)} />
        ))}
      </View>
      <View style={styles.summary}>
        <View style={styles.summaryLine}>
          <Text style={text.body}>Delivery</Text>
          <Text style={text.name}>Free</Text>
        </View>
        <View style={styles.summaryLine}>
          <Text style={text.title}>Total</Text>
          <Text style={text.title}>{formatPrice(TOTAL)}</Text>
        </View>
        <PrimaryButton label="Checkout" />
      </View>
    </View>
  );
}

function Row({ item, onPress }: { item: Item; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityLabel={`Open ${item.name}`}>
      <Animated.View
        sharedTransitionTag={`bag-row-${item.id}`}
        sharedTransitionStyle={TO_PANEL}
        style={styles.row}>
        <Thumb item={item} style={styles.rowThumb} />
        <View style={styles.rowText}>
          <Text style={text.name}>{item.name}</Text>
          <Text style={styles.detail}>{formatPrice(item.price)} each</Text>
        </View>
        <Counter item={item} />
      </Animated.View>
    </Pressable>
  );
}

function Panel({ item, onClose }: { item: Item; onClose: () => void }) {
  return (
    <Animated.View
      sharedTransitionTag={`bag-row-${item.id}`}
      sharedTransitionStyle={TO_ROW}
      style={[styles.panel, { backgroundColor: item.tint }]}>
      <Thumb item={item} style={styles.panelPhoto} />
      <View style={styles.panelTitle}>
        <Text style={styles.panelName}>{item.name}</Text>
        <Text style={styles.detail}>{item.detail}</Text>
        <Text style={text.price}>{formatPrice(item.price)} each</Text>
      </View>
      <RoundButton icon="close" onPress={onClose} style={styles.closeButton} />
      <Text style={[text.body, styles.description]}>{item.description}</Text>
      <View style={styles.notes}>
        {item.notes.map((note) => (
          <NoteChip key={note} label={note} />
        ))}
      </View>
      <Counter item={item} style={styles.panelCounter} />
      <PrimaryButton
        label={`Done · ${formatPrice(item.price * item.quantity)}`}
        onPress={onClose}
        style={styles.doneButton}
      />
    </Animated.View>
  );
}

function Thumb({
  item,
  style,
}: {
  item: Item;
  style: React.ComponentProps<typeof Animated.Image>['style'];
}) {
  return (
    <Animated.Image
      source={item.image}
      sharedTransitionTag={
        RECORDING.ownTags ? `bag-thumb-${item.id}` : undefined
      }
      sharedTransitionStyle={THUMB_TRANSITION}
      style={style}
    />
  );
}

function Counter({
  item,
  style,
}: {
  item: Item;
  style?: React.ComponentProps<typeof Animated.View>['style'];
}) {
  return (
    <Animated.View
      sharedTransitionTag={
        RECORDING.ownTags ? `bag-counter-${item.id}` : undefined
      }
      sharedTransitionStyle={COUNTER_TRANSITION}
      style={[styles.counter, style]}>
      <Icon name="minus" size={18} />
      <Text style={styles.count}>{item.quantity}</Text>
      <Icon name="plus" size={18} />
    </Animated.View>
  );
}

const PANEL_PADDING = 14;
const PANEL_PHOTO = 132;
const COUNTER_WIDTH = 112;
const COUNTER_HEIGHT = 44;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  fill: {
    flex: 1,
  },
  bag: {
    flex: 1,
    paddingHorizontal: 18,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headline: {
    marginTop: 8,
    marginBottom: 18,
  },
  rows: {
    gap: 12,
  },
  row: {
    padding: 10,
    borderRadius: 28,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.white,
    overflow: 'hidden',
    ...shadow,
  },
  rowThumb: {
    width: 64,
    height: 64,
    borderRadius: 20,
  },
  rowText: {
    flex: 1,
    gap: 3,
  },
  detail: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.navySoft,
  },
  counter: {
    width: COUNTER_WIDTH,
    height: COUNTER_HEIGHT,
    borderRadius: COUNTER_HEIGHT / 2,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.paradise,
  },
  count: {
    fontFamily: fonts.bold,
    fontSize: 17,
    color: colors.navy,
  },
  summary: {
    flex: 1,
    justifyContent: 'flex-end',
    gap: 10,
  },
  summaryLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 6,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 26, 114, 0.35)',
  },
  panelSlot: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'flex-end',
    paddingHorizontal: 10,
  },
  panel: {
    padding: PANEL_PADDING,
    borderRadius: 36,
    overflow: 'hidden',
    ...shadow,
  },
  panelPhoto: {
    position: 'absolute',
    left: PANEL_PADDING,
    top: PANEL_PADDING,
    width: PANEL_PHOTO,
    height: PANEL_PHOTO,
    borderRadius: 28,
  },
  panelTitle: {
    height: PANEL_PHOTO,
    marginLeft: PANEL_PHOTO + 16,
    marginRight: 44,
    justifyContent: 'center',
    gap: 4,
  },
  panelName: {
    ...text.title,
    fontSize: 24,
  },
  closeButton: {
    position: 'absolute',
    top: PANEL_PADDING,
    right: PANEL_PADDING,
  },
  description: {
    marginTop: 16,
    paddingHorizontal: 4,
  },
  notes: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
    paddingHorizontal: 2,
  },
  panelCounter: {
    position: 'absolute',
    left: PANEL_PADDING,
    bottom: PANEL_PADDING + (58 - COUNTER_HEIGHT) / 2,
  },
  doneButton: {
    marginTop: 20,
    marginLeft: COUNTER_WIDTH + 12,
  },
});
