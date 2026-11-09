import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { SharedTransition } from 'react-native-reanimated';

import type { Cake } from './cakes';
import { CAKES, CAKES_BY_ID, formatPrice } from './cakes';
import { NATIVE_HEADER } from './nativeHeader';
import { colors, shadow, text } from './theme';
import {
  NoteChip,
  PrimaryButton,
  ScreenBoundary,
  Stars,
  useHiddenAppHeader,
} from './ui';

type ParamList = {
  Shop: undefined;
  QuickLook: { id: string };
};

const TRANSITION = SharedTransition.springify(600).dampingRatio(0.85);

const Stack = createNativeStackNavigator<ParamList>();

export default function BoundaryFormSheet() {
  useHiddenAppHeader();
  return (
    <Stack.Navigator
      screenOptions={NATIVE_HEADER}
      screenLayout={({ children }) => (
        <ScreenBoundary>{children}</ScreenBoundary>
      )}>
      <Stack.Screen
        name="Shop"
        component={ShopScreen}
        options={{
          title: 'Quick look',
          headerLargeTitle: true,
          unstable_headerRightItems: () => [
            {
              type: 'button',
              label: 'Cart',
              icon: { type: 'sfSymbol', name: 'bag' },
              badge: { value: 3 },
              onPress: () => {},
            },
          ],
        }}
      />
      <Stack.Screen
        name="QuickLook"
        component={QuickLookScreen}
        options={{
          presentation: 'formSheet',
          headerShown: false,
          sheetAllowedDetents: [0.72, 1],
          sheetGrabberVisible: true,
          sheetCornerRadius: 40,
          contentStyle: styles.sheet,
        }}
      />
    </Stack.Navigator>
  );
}

function ShopScreen({ navigation }: NativeStackScreenProps<ParamList, 'Shop'>) {
  return (
    <ScrollView
      style={styles.screen}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.content}>
      <Text style={[text.body, styles.intro]}>
        Tap a treat to take a closer look.
      </Text>
      <View style={styles.grid}>
        {CAKES.map((cake) => (
          <GridItem
            key={cake.id}
            cake={cake}
            onPress={() => navigation.navigate('QuickLook', { id: cake.id })}
          />
        ))}
      </View>
    </ScrollView>
  );
}

function GridItem({ cake, onPress }: { cake: Cake; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.item}>
      <Animated.Image
        source={cake.image}
        sharedTransitionTag={`form-sheet-${cake.id}`}
        sharedTransitionStyle={TRANSITION}
        style={styles.itemPhoto}
      />
      <Text style={text.name} numberOfLines={1}>
        {cake.name}
      </Text>
      <Text style={text.price}>{formatPrice(cake.price)}</Text>
    </Pressable>
  );
}

function QuickLookScreen({
  route,
  navigation,
}: NativeStackScreenProps<ParamList, 'QuickLook'>) {
  const cake = CAKES_BY_ID[route.params.id];
  return (
    <View style={styles.quickLook}>
      <Animated.Image
        source={cake.image}
        sharedTransitionTag={`form-sheet-${cake.id}`}
        sharedTransitionStyle={TRANSITION}
        style={styles.sheetPhoto}
      />
      <View style={styles.titleRow}>
        <Text style={text.title}>{cake.name}</Text>
        <Stars />
      </View>
      <Text style={text.body} numberOfLines={3}>
        {cake.description}
      </Text>
      <View style={styles.notes}>
        {cake.notes.map((note) => (
          <NoteChip key={note} label={note} />
        ))}
      </View>
      <PrimaryButton
        label={`Add to cart · ${formatPrice(cake.price)}`}
        onPress={() => navigation.goBack()}
        style={styles.addButton}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  intro: {
    marginBottom: 16,
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
  sheet: {
    backgroundColor: colors.cream,
  },
  quickLook: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 40,
    gap: 12,
  },
  sheetPhoto: {
    width: '100%',
    height: 320,
    borderRadius: 32,
  },
  titleRow: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  notes: {
    flexDirection: 'row',
    gap: 8,
  },
  addButton: {
    marginTop: 'auto',
  },
});
