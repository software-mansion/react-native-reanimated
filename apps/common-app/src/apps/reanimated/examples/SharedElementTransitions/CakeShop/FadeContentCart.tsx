import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, { SharedTransition } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Cake } from './cakes';
import { CAKES, CAKES_BY_ID, formatPrice, SHOP_NAME } from './cakes';
import { colors, fonts, shadow, text } from './theme';
import { Icon, RoundButton, ScreenBoundary, useHiddenAppHeader } from './ui';

type ParamList = {
  Shop: undefined;
  Cart: undefined;
};

const BAR_TRANSITION = SharedTransition.springify(700)
  .dampingRatio(0.9)
  .fadeContent();
const OWN_TRANSITION = SharedTransition.springify(700).dampingRatio(0.9);

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

const Stack = createNativeStackNavigator<ParamList>();

export default function FadeContentCart() {
  useHiddenAppHeader();
  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false }}
      screenLayout={({ children }) => (
        <ScreenBoundary>{children}</ScreenBoundary>
      )}>
      <Stack.Screen name="Shop" component={ShopScreen} />
      <Stack.Screen
        name="Cart"
        component={CartScreen}
        options={{ animation: 'fade' }}
      />
    </Stack.Navigator>
  );
}

function ShopScreen({ navigation }: NativeStackScreenProps<ParamList, 'Shop'>) {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.screen}>
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
        onPress={() => navigation.navigate('Cart')}
        style={[styles.barSlot, { bottom: insets.bottom + 12 }]}>
        <Animated.View
          sharedTransitionTag="cart-panel"
          sharedTransitionStyle={BAR_TRANSITION}
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

function CartScreen({ navigation }: NativeStackScreenProps<ParamList, 'Cart'>) {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.cartScreen}>
      <Animated.View
        sharedTransitionTag="cart-panel"
        sharedTransitionStyle={BAR_TRANSITION}
        style={[
          styles.panel,
          { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 12 },
        ]}>
        <View style={styles.panelHeader}>
          <RoundButton
            icon="close"
            color={colors.white}
            background="#ffffff1f"
            onPress={() => navigation.goBack()}
          />
          <Text style={styles.panelCaption}>{SHOP_NAME}</Text>
          <View style={styles.headerSpacer} />
        </View>
        <Text style={styles.panelTitle}>Your cart</Text>
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
                <Icon name="minus" size={16} color={colors.white} />
                <Text style={styles.quantity}>{quantity}</Text>
                <Icon name="plus" size={16} color={colors.white} />
              </View>
            </View>
          ))}
        </View>
        <View style={styles.summary}>
          <SummaryLine label="Subtotal" value={formatPrice(TOTAL)} />
          <SummaryLine label="Delivery" value="Free" />
          <View style={styles.divider} />
          <SummaryLine label="Total" value={formatPrice(TOTAL)} large />
        </View>
        <Pressable style={styles.payButton}>
          <Text style={styles.payText}>Checkout · {formatPrice(TOTAL)}</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

function SummaryLine({
  label,
  value,
  large = false,
}: {
  label: string;
  value: string;
  large?: boolean;
}) {
  return (
    <View style={styles.summaryLine}>
      <Text style={[styles.summaryLabel, large && styles.summaryLarge]}>
        {label}
      </Text>
      <Text style={[styles.summaryValue, large && styles.summaryLarge]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.cream,
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
  cartScreen: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  panel: {
    flex: 1,
    paddingHorizontal: 20,
    backgroundColor: colors.navy,
    overflow: 'hidden',
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
  headerSpacer: {
    width: 44,
  },
  panelTitle: {
    ...text.display,
    marginTop: 18,
    marginBottom: 18,
    color: colors.white,
  },
  rows: {
    gap: 12,
  },
  row: {
    padding: 10,
    borderRadius: 26,
    backgroundColor: '#ffffff14',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  rowThumb: {
    width: 76,
    height: 76,
    borderRadius: 20,
  },
  rowText: {
    flex: 1,
    gap: 4,
  },
  rowName: {
    fontFamily: fonts.medium,
    fontSize: 17,
    color: colors.white,
  },
  rowPrice: {
    fontFamily: fonts.regular,
    fontSize: 15,
    color: colors.peri,
  },
  stepper: {
    height: 40,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#ffffff1f',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  quantity: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: colors.white,
  },
  summary: {
    marginTop: 'auto',
    gap: 10,
    marginBottom: 18,
  },
  summaryLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryLabel: {
    fontFamily: fonts.regular,
    fontSize: 16,
    color: colors.peri,
  },
  summaryValue: {
    fontFamily: fonts.medium,
    fontSize: 16,
    color: colors.white,
  },
  summaryLarge: {
    fontFamily: fonts.bold,
    fontSize: 22,
    color: colors.white,
  },
  divider: {
    height: 1,
    backgroundColor: '#ffffff26',
  },
  payButton: {
    height: 60,
    borderRadius: 30,
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
