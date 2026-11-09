import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import React, { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  SharedTransition,
  SharedTransitionBoundary,
  ZoomIn,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Cake } from './cakes';
import { CAKES_BY_ID, formatPrice } from './cakes';
import { SheetBackdrop, sheetStyles, useSheetBoundary } from './sheet';
import { colors, fonts, text } from './theme';
import {
  Icon,
  NoteChip,
  PrimaryButton,
  RoundButton,
  Stars,
  useHiddenAppHeader,
} from './ui';

const TRANSITION = SharedTransition.springify(650).dampingRatio(0.85);

const PRODUCT = CAKES_BY_ID['chocolate-layer'];
const INITIAL_CART = ['raspberry-tart', 'blueberry-tart'];

export default function BoundaryCartSheet() {
  useHiddenAppHeader();
  const insets = useSafeAreaInsets();
  const sheet = useSheetBoundary();
  const [cart, setCart] = useState(INITIAL_CART);
  const cakes = cart.map((id) => CAKES_BY_ID[id]);
  const total = cakes.reduce((sum, cake) => sum + cake.price, 0);

  const addProduct = () => {
    if (!cart.includes(PRODUCT.id)) {
      setCart([...cart, PRODUCT.id]);
    }
  };

  return (
    <View style={styles.screen}>
      <SharedTransitionBoundary isActive={!sheet.isActive}>
        <View style={styles.page}>
          <Image source={PRODUCT.image} style={styles.hero} />
          <View style={[styles.topBar, { top: insets.top + 8 }]}>
            <RoundButton icon="back" />
            <Pressable onPress={sheet.open} style={styles.cartButton}>
              <View style={styles.cartThumbs}>
                {cakes.map((cake, index) => (
                  <Animated.View
                    key={cake.id}
                    entering={ZoomIn.springify()}
                    style={{ marginLeft: index ? -12 : 0 }}>
                    <CartThumb cake={cake} style={styles.headerThumb} />
                  </Animated.View>
                ))}
              </View>
              <Icon name="bag" size={20} />
              <Text style={styles.cartCount}>{cakes.length}</Text>
            </Pressable>
          </View>
          <View style={styles.body}>
            <View style={styles.titleRow}>
              <Text style={text.display}>{PRODUCT.name}</Text>
              <Stars rating={5} />
            </View>
            <Text style={text.body}>{PRODUCT.description}</Text>
            <View style={styles.notes}>
              {PRODUCT.notes.map((note) => (
                <NoteChip key={note} label={note} />
              ))}
            </View>
          </View>
          <View style={[styles.footer, { paddingBottom: insets.bottom + 8 }]}>
            <Text style={styles.footerPrice}>{formatPrice(PRODUCT.price)}</Text>
            <PrimaryButton
              label={cart.includes(PRODUCT.id) ? 'In your cart' : 'Add to cart'}
              onPress={addProduct}
              style={styles.footerButton}
            />
          </View>
        </View>
      </SharedTransitionBoundary>
      <BottomSheet
        ref={sheet.ref}
        index={-1}
        snapPoints={['62%']}
        enableDynamicSizing={false}
        enablePanDownToClose
        backdropComponent={SheetBackdrop}
        backgroundStyle={sheetStyles.background}
        handleIndicatorStyle={sheetStyles.handle}
        {...sheet.sheetProps}>
        <BottomSheetView style={styles.sheetContent}>
          <SharedTransitionBoundary isActive={sheet.isActive}>
            <Text style={styles.sheetTitle}>Your cart</Text>
            <View style={styles.rows}>
              {cakes.map((cake) => (
                <View key={cake.id} style={styles.row}>
                  {sheet.hasLanded ? (
                    <CartThumb cake={cake} style={styles.rowThumb} />
                  ) : (
                    <View style={styles.rowThumb} />
                  )}
                  <View style={styles.rowText}>
                    <Text style={styles.rowName}>{cake.name}</Text>
                    <Text style={styles.rowTagline}>{cake.tagline}</Text>
                  </View>
                  <Text style={text.price}>{formatPrice(cake.price)}</Text>
                </View>
              ))}
            </View>
            <PrimaryButton
              label={`Checkout · ${formatPrice(total)}`}
              style={styles.checkout}
            />
          </SharedTransitionBoundary>
        </BottomSheetView>
      </BottomSheet>
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
      sharedTransitionTag={`cart-sheet-${cake.id}`}
      sharedTransitionStyle={TRANSITION}
      style={style}
    />
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  page: {
    flex: 1,
  },
  hero: {
    width: '100%',
    height: 430,
    borderBottomLeftRadius: 44,
    borderBottomRightRadius: 44,
  },
  topBar: {
    position: 'absolute',
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cartButton: {
    height: 52,
    paddingLeft: 6,
    paddingRight: 16,
    borderRadius: 26,
    backgroundColor: colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cartThumbs: {
    flexDirection: 'row',
  },
  headerThumb: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: colors.white,
  },
  cartCount: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: colors.navy,
  },
  body: {
    flex: 1,
    padding: 24,
    gap: 14,
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
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    paddingHorizontal: 24,
  },
  footerPrice: {
    fontFamily: fonts.bold,
    fontSize: 26,
    color: colors.navy,
  },
  footerButton: {
    flex: 1,
  },
  sheetContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  sheetTitle: {
    ...text.title,
    marginTop: 4,
    marginBottom: 16,
  },
  rows: {
    gap: 12,
  },
  row: {
    padding: 10,
    borderRadius: 26,
    backgroundColor: colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  rowThumb: {
    width: 72,
    height: 72,
    borderRadius: 20,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  rowName: {
    fontFamily: fonts.medium,
    fontSize: 17,
    color: colors.navy,
  },
  rowTagline: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.navySoft,
  },
  checkout: {
    marginTop: 'auto',
  },
});
