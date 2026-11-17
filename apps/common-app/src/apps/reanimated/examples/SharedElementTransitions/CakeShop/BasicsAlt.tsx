import { useIsFocused } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { LogBox, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  SharedTransition,
  SharedTransitionBoundary,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Cake, Category } from './cakes';
import { CAKES_BY_ID, CATEGORIES, formatPrice, SHOP_NAME } from './cakes';
import { colors, fonts, shadow, text } from './theme';
import { PrimaryButton, RoundButton, Stars, useHiddenAppHeader } from './ui';

LogBox.ignoreAllLogs();

// 1 plays the app at normal speed. 0.3 records the slow replay.
const SPEED = 1;

const TRANSITION = SharedTransition.duration(500 / SPEED);

const CATEGORY_ROW = ['cakes', 'macarons', 'tarts', 'cupcakes'].map(
  (id) => CATEGORIES.find((category) => category.id === id)!
);
const CAKE_OF_THE_DAY = CAKES_BY_ID['berry-crown'];

type ParamList = {
  Home: undefined;
  Category: { id: string };
  Order: undefined;
};

const Stack = createNativeStackNavigator<ParamList>();

export default function BasicsAlt() {
  useHiddenAppHeader();
  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false, contentStyle: styles.screen }}
      screenLayout={({ children }) => (
        <ScreenBoundary>{children}</ScreenBoundary>
      )}>
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="Category" component={CategoryScreen} />
      <Stack.Screen
        name="Order"
        component={OrderScreen}
        options={{
          presentation: 'transparentModal',
          animation: 'fade',
          contentStyle: styles.backdrop,
        }}
      />
    </Stack.Navigator>
  );
}

function ScreenBoundary({ children }: { children: React.ReactNode }) {
  const isFocused = useIsFocused();
  return (
    <SharedTransitionBoundary isActive={isFocused}>
      {children}
    </SharedTransitionBoundary>
  );
}

function HomeScreen({ navigation }: NativeStackScreenProps<ParamList, 'Home'>) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.home, { paddingTop: insets.top + 12 }]}>
      <Text style={text.caption}>{SHOP_NAME}</Text>
      <Text style={[text.display, styles.headline]}>
        Fresh from{'\n'}the oven
      </Text>
      <View style={styles.categoryRow}>
        {CATEGORY_ROW.map((category) => (
          <CategoryAvatar
            key={category.id}
            category={category}
            onPress={() => navigation.navigate('Category', { id: category.id })}
          />
        ))}
      </View>
      <Text style={[text.caption, styles.sectionLabel]}>Cake of the day</Text>
      <Pressable
        onPress={() => navigation.navigate('Order')}
        style={[styles.dayCard, { backgroundColor: CAKE_OF_THE_DAY.tint }]}>
        <Animated.Image
          source={CAKE_OF_THE_DAY.image}
          sharedTransitionTag={`alt-day-${CAKE_OF_THE_DAY.id}`}
          sharedTransitionStyle={TRANSITION}
          style={styles.dayPhoto}
        />
        <CakeLabel cake={CAKE_OF_THE_DAY} />
      </Pressable>
    </View>
  );
}

function CategoryAvatar({
  category,
  onPress,
}: {
  category: Category;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.avatar}>
      <Animated.Image
        source={category.image}
        sharedTransitionTag={`alt-category-${category.id}`}
        sharedTransitionStyle={TRANSITION}
        style={styles.avatarPhoto}
      />
      <Text style={styles.avatarName}>{category.name}</Text>
    </Pressable>
  );
}

function CakeLabel({ cake }: { cake: Cake }) {
  return (
    <View style={styles.cakeLabel}>
      <View style={styles.cakeTitles}>
        <Text style={text.title}>{cake.name}</Text>
        <Text style={styles.tagline}>{cake.tagline}</Text>
      </View>
      <Text style={text.price}>{formatPrice(cake.price)}</Text>
    </View>
  );
}

function CategoryScreen({
  route,
  navigation,
}: NativeStackScreenProps<ParamList, 'Category'>) {
  const category = CATEGORIES.find(({ id }) => id === route.params.id)!;
  return (
    <View style={styles.category}>
      <Animated.Image
        source={category.image}
        sharedTransitionTag={`alt-category-${category.id}`}
        sharedTransitionStyle={TRANSITION}
        style={styles.header}
      />
      <View style={styles.categoryBody}>
        <View style={styles.titleRow}>
          <View style={styles.title}>
            <RoundButton
              icon="back"
              background={category.tint}
              onPress={() => navigation.goBack()}
            />
            <Text style={text.display}>{category.name}</Text>
          </View>
          <Text style={styles.count}>{category.count} kinds</Text>
        </View>
        <View style={styles.items}>
          {category.items.map((item) => (
            <View key={item.name} style={styles.item}>
              <Animated.Image source={item.image} style={styles.itemPhoto} />
              <View style={styles.itemLabel}>
                <Text style={text.name} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={styles.itemPrice}>{formatPrice(item.price)}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const SIZES = ['Slice', 'Half', 'Whole'];

function OrderScreen({
  navigation,
}: NativeStackScreenProps<ParamList, 'Order'>) {
  const cake = CAKE_OF_THE_DAY;
  return (
    <View style={styles.orderArea}>
      <Pressable style={StyleSheet.absoluteFill} onPress={navigation.goBack} />
      <View style={styles.order}>
        <Animated.Image
          source={cake.image}
          sharedTransitionTag={`alt-day-${cake.id}`}
          sharedTransitionStyle={TRANSITION}
          style={styles.orderPhoto}
        />
        <View style={styles.orderDetails}>
          <View style={styles.titleRow}>
            <Text style={text.title}>{cake.name}</Text>
            <Stars />
          </View>
          <View style={styles.sizes}>
            {SIZES.map((size) => (
              <View
                key={size}
                style={[styles.size, size === 'Whole' && styles.sizeSelected]}>
                <Text style={styles.sizeText}>{size}</Text>
              </View>
            ))}
          </View>
          <PrimaryButton
            label={`Add to order · ${formatPrice(cake.price)}`}
            onPress={navigation.goBack}
          />
        </View>
      </View>
    </View>
  );
}

const AVATAR_SIZE = 76;

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.cream,
  },
  home: {
    flex: 1,
    paddingHorizontal: 20,
    backgroundColor: colors.cream,
  },
  headline: {
    marginTop: 8,
    fontSize: 40,
    lineHeight: 42,
  },
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 28,
  },
  avatar: {
    alignItems: 'center',
    gap: 8,
  },
  avatarPhoto: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
  },
  avatarName: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.navy,
  },
  sectionLabel: {
    marginTop: 32,
    marginBottom: 12,
  },
  dayCard: {
    padding: 10,
    borderRadius: 38,
  },
  dayPhoto: {
    width: '100%',
    height: 340,
    borderRadius: 30,
  },
  cakeLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 10,
    paddingVertical: 14,
  },
  cakeTitles: {
    flex: 1,
    gap: 2,
  },
  tagline: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.navy,
    opacity: 0.7,
  },
  category: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  header: {
    width: '100%',
    height: 360,
    borderBottomLeftRadius: 44,
    borderBottomRightRadius: 44,
  },
  title: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  categoryBody: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 22,
    gap: 18,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  count: {
    fontFamily: fonts.medium,
    fontSize: 15,
    color: colors.navySoft,
  },
  items: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  item: {
    width: '48%',
    flexGrow: 1,
    padding: 8,
    borderRadius: 26,
    backgroundColor: colors.white,
  },
  itemPhoto: {
    width: '100%',
    height: 112,
    borderRadius: 20,
  },
  itemLabel: {
    paddingHorizontal: 6,
    paddingTop: 8,
    paddingBottom: 2,
    gap: 2,
  },
  itemPrice: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.navySoft,
  },
  backdrop: {
    backgroundColor: 'rgba(13, 15, 38, 0.45)',
  },
  orderArea: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  order: {
    padding: 12,
    gap: 16,
    borderRadius: 42,
    backgroundColor: colors.cream,
    ...shadow,
  },
  orderPhoto: {
    width: '100%',
    height: 420,
    borderRadius: 32,
  },
  orderDetails: {
    gap: 16,
    paddingHorizontal: 6,
    paddingBottom: 6,
  },
  sizes: {
    flexDirection: 'row',
    gap: 10,
  },
  size: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  sizeSelected: {
    backgroundColor: colors.yellow,
  },
  sizeText: {
    fontFamily: fonts.medium,
    fontSize: 16,
    color: colors.navy,
  },
});
