import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  FadeInDown,
  SharedTransition,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Cake } from './cakes';
import { CAKES, CAKES_BY_ID, formatPrice, SHOP_NAME } from './cakes';
import { colors, fonts, text } from './theme';
import {
  Icon,
  NoteChip,
  PrimaryButton,
  RoundButton,
  ScreenBoundary,
  Stars,
  useHiddenAppHeader,
} from './ui';

type ParamList = {
  Menu: undefined;
  Product: { id: string };
};

const EASING = Easing.bezier(0.22, 1, 0.36, 1);
const CARD_TRANSITION = SharedTransition.duration(700)
  .easing(EASING)
  .fadeContent();
const OWN_TRANSITION = SharedTransition.duration(700).easing(EASING);

const Stack = createNativeStackNavigator<ParamList>();

export default function FadeContentMenu() {
  useHiddenAppHeader();
  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false }}
      screenLayout={({ children }) => (
        <ScreenBoundary>{children}</ScreenBoundary>
      )}>
      <Stack.Screen name="Menu" component={MenuScreen} />
      <Stack.Screen name="Product" component={ProductScreen} />
    </Stack.Navigator>
  );
}

function MenuScreen({ navigation }: NativeStackScreenProps<ParamList, 'Menu'>) {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.menuContent,
        { paddingTop: insets.top + 12 },
      ]}>
      <View style={styles.topBar}>
        <Text style={text.caption}>{SHOP_NAME}</Text>
        <View style={styles.topBarButtons}>
          <RoundButton icon="search" />
          <RoundButton icon="bag" />
        </View>
      </View>
      <Text style={[text.display, styles.headline]}>
        Baked this{'\n'}morning
      </Text>
      {CAKES.slice(0, 5).map((cake) => (
        <MenuCard
          key={cake.id}
          cake={cake}
          onPress={() => navigation.navigate('Product', { id: cake.id })}
        />
      ))}
    </ScrollView>
  );
}

function MenuCard({ cake, onPress }: { cake: Cake; onPress: () => void }) {
  return (
    <Pressable onPress={onPress}>
      <Animated.View
        sharedTransitionTag={`menu-card-${cake.id}`}
        sharedTransitionStyle={CARD_TRANSITION}
        style={[styles.card, { backgroundColor: cake.tint }]}>
        <Animated.Image
          source={cake.image}
          sharedTransitionTag={`menu-photo-${cake.id}`}
          sharedTransitionStyle={OWN_TRANSITION}
          style={styles.cardPhoto}
        />
        <View style={styles.cardText}>
          <Text style={text.name}>{cake.name}</Text>
          <Text style={styles.tagline} numberOfLines={1}>
            {cake.tagline}
          </Text>
          <PricePill cake={cake} />
        </View>
        <View style={styles.addButton}>
          <Icon name="plus" color={colors.white} size={20} />
        </View>
      </Animated.View>
    </Pressable>
  );
}

function PricePill({ cake }: { cake: Cake }) {
  return (
    <Animated.View
      sharedTransitionTag={`menu-price-${cake.id}`}
      sharedTransitionStyle={OWN_TRANSITION}
      style={styles.pricePill}>
      <Text style={text.price}>{formatPrice(cake.price)}</Text>
    </Animated.View>
  );
}

function ProductScreen({
  route,
  navigation,
}: NativeStackScreenProps<ParamList, 'Product'>) {
  const insets = useSafeAreaInsets();
  const cake = CAKES_BY_ID[route.params.id];
  return (
    <View style={styles.productScreen}>
      <Animated.View
        sharedTransitionTag={`menu-card-${cake.id}`}
        sharedTransitionStyle={CARD_TRANSITION}
        style={[styles.productCard, { backgroundColor: cake.tint }]}>
        <Animated.Image
          source={cake.image}
          sharedTransitionTag={`menu-photo-${cake.id}`}
          sharedTransitionStyle={OWN_TRANSITION}
          style={styles.heroPhoto}
        />
        <View style={[styles.heroButtons, { top: insets.top + 8 }]}>
          <RoundButton icon="back" onPress={() => navigation.goBack()} />
          <RoundButton icon="heart" color={colors.pink} />
        </View>
        <Animated.View
          entering={FadeInDown.duration(500).easing(EASING)}
          style={styles.productBody}>
          <View style={styles.productTitleRow}>
            <Text style={[text.display, styles.productTitle]}>{cake.name}</Text>
            <Stars />
          </View>
          <Text style={text.body}>{cake.description}</Text>
          <View style={styles.notes}>
            {cake.notes.map((note) => (
              <NoteChip key={note} label={note} />
            ))}
          </View>
          <Text style={[text.caption, styles.sizeLabel]}>Size</Text>
          <SizePicker />
        </Animated.View>
        <View
          style={[styles.productFooter, { paddingBottom: insets.bottom + 8 }]}>
          <PricePill cake={cake} />
          <PrimaryButton label="Add to cart" style={styles.footerButton} />
        </View>
      </Animated.View>
    </View>
  );
}

const SIZES = ['6″ · 6 slices', '8″ · 10 slices', '10″ · 16 slices'];

function SizePicker() {
  const [selected, setSelected] = useState(1);
  return (
    <View style={styles.sizes}>
      {SIZES.map((size, index) => (
        <Pressable
          key={size}
          onPress={() => setSelected(index)}
          style={[styles.size, index === selected && styles.selectedSize]}>
          <Text
            style={[
              styles.sizeText,
              index === selected && styles.selectedSizeText,
            ]}>
            {size}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  menuContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 14,
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
    marginTop: 8,
    marginBottom: 6,
  },
  card: {
    height: 128,
    padding: 12,
    borderRadius: 30,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    overflow: 'hidden',
  },
  cardPhoto: {
    width: 104,
    height: 104,
    borderRadius: 22,
  },
  cardText: {
    flex: 1,
    gap: 4,
    alignItems: 'flex-start',
  },
  tagline: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.navySoft,
  },
  pricePill: {
    marginTop: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: colors.white,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignSelf: 'flex-end',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.navy,
  },
  productScreen: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  productCard: {
    flex: 1,
    overflow: 'hidden',
  },
  heroPhoto: {
    width: '100%',
    height: 420,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
  },
  heroButtons: {
    position: 'absolute',
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  productBody: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
    gap: 14,
  },
  productTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  productTitle: {
    flexShrink: 1,
  },
  notes: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  productFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 24,
  },
  footerButton: {
    flex: 1,
  },
  sizeLabel: {
    marginTop: 8,
  },
  sizes: {
    flexDirection: 'row',
    gap: 8,
  },
  size: {
    flex: 1,
    height: 52,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedSize: {
    backgroundColor: colors.white,
    borderColor: colors.navy,
  },
  sizeText: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.navy,
  },
  selectedSizeText: {
    fontFamily: fonts.bold,
  },
});
