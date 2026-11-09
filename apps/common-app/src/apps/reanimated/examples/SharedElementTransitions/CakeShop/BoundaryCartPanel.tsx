import React, { useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  SharedTransition,
  SharedTransitionBoundary,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Cake } from './cakes';
import { CAKES, CAKES_BY_ID, formatPrice, SHOP_NAME } from './cakes';
import { colors, fonts, shadow, text } from './theme';
import { Icon, RoundButton, useHiddenAppHeader } from './ui';

const EASING = Easing.bezier(0.25, 1, 0.5, 1);
const PANEL_TRANSITION = SharedTransition.duration(500)
  .easing(EASING)
  .fadeContent({ fadeOut: { end: 0.3 }, fadeIn: { duration: 150 } });
const OWN_TRANSITION = SharedTransition.duration(500).easing(EASING);
const CLOSE_DELAY = 500;

const CART = [
  { cake: CAKES_BY_ID['strawberry-cloud'], quantity: 1 },
  { cake: CAKES_BY_ID['raspberry-tart'], quantity: 2 },
  { cake: CAKES_BY_ID['lemon-tart'], quantity: 3 },
];

const TOTAL = CART.reduce(
  (sum, { cake, quantity }) => sum + cake.price * quantity,
  0
);
const ITEM_COUNT = CART.reduce((sum, { quantity }) => sum + quantity, 0);

export default function BoundaryCartPanel() {
  useHiddenAppHeader();
  const insets = useSafeAreaInsets();
  const [isMounted, setIsMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const open = () => {
    setIsMounted(true);
    setIsOpen(true);
  };

  const close = () => {
    setIsOpen(false);
    setTimeout(() => setIsMounted(false), CLOSE_DELAY);
  };

  return (
    <View style={styles.screen}>
      <SharedTransitionBoundary isActive={!isOpen}>
        <View style={styles.fill}>
          <ScrollView
            contentContainerStyle={[
              styles.shopContent,
              { paddingTop: insets.top + 12 },
            ]}>
            <Text style={text.caption}>{SHOP_NAME}</Text>
            <Text style={[text.display, styles.headline]}>
              Treat yourself,{'\n'}you earned it
            </Text>
            <View style={styles.grid}>
              {CAKES.map((cake) => (
                <ShopItem key={cake.id} cake={cake} />
              ))}
            </View>
          </ScrollView>
          <Pressable
            onPress={open}
            style={[styles.barSlot, { bottom: insets.bottom + 12 }]}>
            <Animated.View
              sharedTransitionTag="cart-panel"
              sharedTransitionStyle={PANEL_TRANSITION}
              style={styles.bar}>
              <View style={styles.barThumbs}>
                {CART.map(({ cake }, index) => (
                  <CartThumb
                    key={cake.id}
                    cake={cake}
                    style={[styles.barThumb, { marginLeft: index ? -14 : 0 }]}
                  />
                ))}
              </View>
              <View style={styles.barText}>
                <Text style={styles.barTitle}>{ITEM_COUNT} treats</Text>
                <Text style={styles.barTotal}>{formatPrice(TOTAL)}</Text>
              </View>
              <View style={styles.barButton}>
                <Text style={styles.barButtonText}>Cart</Text>
                <Icon name="arrow" size={18} color={colors.navy} />
              </View>
            </Animated.View>
          </Pressable>
        </View>
      </SharedTransitionBoundary>
      {isMounted && (
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
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
              style={[styles.panelSlot, { bottom: insets.bottom + 12 }]}>
              <CartPanel onClose={close} />
            </View>
          </SharedTransitionBoundary>
        </View>
      )}
    </View>
  );
}

function ShopItem({ cake }: { cake: Cake }) {
  return (
    <View style={styles.item}>
      <Image source={cake.image} style={styles.itemPhoto} />
      <Text style={text.name} numberOfLines={1}>
        {cake.name}
      </Text>
      <Text style={text.price}>{formatPrice(cake.price)}</Text>
    </View>
  );
}

function CartThumb({
  cake,
  style,
}: {
  cake: Cake;
  style: React.ComponentProps<typeof Animated.Image>['style'];
}) {
  return (
    <Animated.Image
      source={cake.image}
      sharedTransitionTag={`cart-thumb-${cake.id}`}
      sharedTransitionStyle={OWN_TRANSITION}
      style={style}
    />
  );
}

function CartPanel({ onClose }: { onClose: () => void }) {
  return (
    <Animated.View
      sharedTransitionTag="cart-panel"
      sharedTransitionStyle={PANEL_TRANSITION}
      style={styles.panel}>
      <View style={styles.panelHeader}>
        <View>
          <Text style={styles.panelCaption}>
            {ITEM_COUNT} treats · {SHOP_NAME}
          </Text>
          <Text style={styles.panelTitle}>Your cart</Text>
        </View>
        <RoundButton
          icon="close"
          color={colors.white}
          background="#ffffff1f"
          onPress={onClose}
        />
      </View>
      <View style={styles.rows}>
        {CART.map(({ cake, quantity }) => (
          <View key={cake.id} style={styles.row}>
            <CartThumb cake={cake} style={styles.rowThumb} />
            <View style={styles.rowText}>
              <Text style={styles.rowName}>{cake.name}</Text>
              <Text style={styles.rowPrice}>
                {formatPrice(cake.price * quantity)}
              </Text>
            </View>
            <View style={styles.stepper}>
              <Icon name="minus" size={14} color={colors.white} />
              <Text style={styles.quantity}>{quantity}</Text>
              <Icon name="plus" size={14} color={colors.white} />
            </View>
          </View>
        ))}
      </View>
      <Pressable style={styles.payButton} onPress={onClose}>
        <Text style={styles.payText}>Checkout · {formatPrice(TOTAL)}</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  fill: {
    flex: 1,
  },
  shopContent: {
    paddingHorizontal: 20,
    paddingBottom: 140,
  },
  headline: {
    marginTop: 10,
    marginBottom: 20,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 14,
  },
  item: {
    width: '48%',
    padding: 10,
    gap: 6,
    borderRadius: 26,
    backgroundColor: colors.white,
    ...shadow,
  },
  itemPhoto: {
    width: '100%',
    height: 150,
    borderRadius: 18,
  },
  barSlot: {
    position: 'absolute',
    left: 16,
    right: 16,
  },
  bar: {
    height: 76,
    paddingHorizontal: 12,
    borderRadius: 38,
    backgroundColor: colors.navy,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    overflow: 'hidden',
    ...shadow,
    shadowOpacity: 0.3,
  },
  barThumbs: {
    flexDirection: 'row',
  },
  barThumb: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: colors.navy,
  },
  barText: {
    flex: 1,
  },
  barTitle: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.peri,
  },
  barTotal: {
    fontFamily: fonts.bold,
    fontSize: 18,
    color: colors.white,
  },
  barButton: {
    height: 48,
    paddingHorizontal: 18,
    borderRadius: 24,
    backgroundColor: colors.yellow,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  barButtonText: {
    fontFamily: fonts.medium,
    fontSize: 16,
    color: colors.navy,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(13, 15, 38, 0.45)',
  },
  panelSlot: {
    position: 'absolute',
    left: 12,
    right: 12,
  },
  panel: {
    padding: 20,
    gap: 16,
    borderRadius: 38,
    backgroundColor: colors.navy,
    overflow: 'hidden',
    ...shadow,
    shadowOpacity: 0.3,
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  panelCaption: {
    ...text.caption,
    color: colors.peri,
  },
  panelTitle: {
    ...text.title,
    marginTop: 2,
    color: colors.white,
  },
  rows: {
    gap: 10,
  },
  row: {
    padding: 8,
    borderRadius: 24,
    backgroundColor: '#ffffff14',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rowThumb: {
    width: 60,
    height: 60,
    borderRadius: 18,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  rowName: {
    fontFamily: fonts.medium,
    fontSize: 16,
    color: colors.white,
  },
  rowPrice: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.peri,
  },
  stepper: {
    height: 36,
    paddingHorizontal: 10,
    marginRight: 4,
    borderRadius: 18,
    backgroundColor: '#ffffff1f',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  quantity: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: colors.white,
  },
  payButton: {
    height: 58,
    borderRadius: 29,
    backgroundColor: colors.yellow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  payText: {
    fontFamily: fonts.bold,
    fontSize: 18,
    color: colors.navy,
  },
});
