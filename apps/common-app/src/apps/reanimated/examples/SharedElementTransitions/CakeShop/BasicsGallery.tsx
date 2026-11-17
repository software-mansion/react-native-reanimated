import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import type { ImageStyle, StyleProp } from 'react-native';
import {
  Dimensions,
  LogBox,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, { SharedTransition } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Cake } from './cakes';
import { CAKES_BY_ID, formatPrice, SHOP_NAME } from './cakes';
import { colors, fonts, shadow, text } from './theme';
import {
  Icon,
  NoteChip,
  PrimaryButton,
  RoundButton,
  ScreenBoundary,
  Stars,
  useHiddenAppHeader,
} from './ui';

LogBox.ignoreAllLogs();

// 1 plays the app at normal speed. A smaller value slows down only the shared photo.
const SPEED = 1;

const TRANSITION = SharedTransition.duration(500 / SPEED);

type ParamList = {
  Gallery: undefined;
  Details: { id: string };
  Special: { id: string };
};

const Stack = createNativeStackNavigator<ParamList>();

const SPECIAL_ID = 'berry-crown';
const GRID_IDS = [
  'strawberry-cloud',
  'raspberry-tart',
  'blueberry-tart',
  'chocolate-layer',
  'lemon-tart',
  'confetti-cake',
];

export default function BasicsGallery() {
  useHiddenAppHeader();
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: styles.screen,
      }}
      screenLayout={({ children }) => (
        <ScreenBoundary>{children}</ScreenBoundary>
      )}>
      <Stack.Screen name="Gallery" component={GalleryScreen} />
      <Stack.Screen name="Details" component={DetailsScreen} />
      <Stack.Screen
        name="Special"
        component={SpecialScreen}
        options={{ presentation: 'modal' }}
      />
    </Stack.Navigator>
  );
}

function GalleryScreen({
  navigation,
}: NativeStackScreenProps<ParamList, 'Gallery'>) {
  const insets = useSafeAreaInsets();
  const special = CAKES_BY_ID[SPECIAL_ID];
  return (
    <View style={[styles.gallery, { paddingTop: insets.top + 12 }]}>
      <View style={styles.topBar}>
        <View style={styles.titles}>
          <Text style={text.caption}>Baked this morning</Text>
          <Text style={text.display}>{SHOP_NAME}</Text>
        </View>
        <RoundButton icon="bag" />
      </View>
      <Pressable
        style={styles.special}
        onPress={() => navigation.navigate('Special', { id: special.id })}>
        <Photo
          cake={special}
          tag={`gallery-special-${special.id}`}
          style={styles.specialPhoto}
        />
        <View style={styles.specialText}>
          <Text style={text.caption}>Cake of the day</Text>
          <Text style={text.title}>{special.name}</Text>
          <Text style={styles.price}>{formatPrice(special.price)}</Text>
        </View>
        <Icon name="arrow" />
      </Pressable>
      <View style={styles.grid}>
        {GRID_IDS.map((id) => (
          <Tile
            key={id}
            cake={CAKES_BY_ID[id]}
            onPress={() => navigation.navigate('Details', { id })}
          />
        ))}
      </View>
    </View>
  );
}

function Tile({ cake, onPress }: { cake: Cake; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.tile}>
      <Photo cake={cake} tag={`gallery-${cake.id}`} style={styles.tilePhoto} />
      <View style={styles.tileLabel}>
        <Text style={styles.tileName} numberOfLines={1}>
          {cake.name}
        </Text>
        <Text style={styles.tilePrice}>{formatPrice(cake.price)}</Text>
      </View>
    </Pressable>
  );
}

function Photo({
  cake,
  tag,
  style,
}: {
  cake: Cake;
  tag: string;
  style: StyleProp<ImageStyle>;
}) {
  return (
    <Animated.Image
      source={cake.image}
      sharedTransitionTag={tag}
      sharedTransitionStyle={TRANSITION}
      style={style}
    />
  );
}

function DetailsScreen({
  route,
  navigation,
}: NativeStackScreenProps<ParamList, 'Details'>) {
  const insets = useSafeAreaInsets();
  const cake = CAKES_BY_ID[route.params.id];
  return (
    <View style={[styles.details, { paddingTop: insets.top + 12 }]}>
      <View style={styles.header}>
        <RoundButton icon="back" onPress={() => navigation.goBack()} />
        <Text style={styles.headerTitle}>{SHOP_NAME}</Text>
        <RoundButton icon="heart" color={colors.pink} />
      </View>
      <Photo cake={cake} tag={`gallery-${cake.id}`} style={styles.hero} />
      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text style={[text.display, styles.title]}>{cake.name}</Text>
          <Stars />
        </View>
        <Text style={text.body}>{cake.description}</Text>
        <View style={styles.notes}>
          {cake.notes.map((note) => (
            <NoteChip key={note} label={note} />
          ))}
        </View>
        <SizePicker />
      </View>
      <View style={[styles.footer, { paddingBottom: insets.bottom + 8 }]}>
        <Text style={styles.footerPrice}>{formatPrice(cake.price)}</Text>
        <PrimaryButton label="Add to cart" style={styles.footerButton} />
      </View>
    </View>
  );
}

function SpecialScreen({
  route,
  navigation,
}: NativeStackScreenProps<ParamList, 'Special'>) {
  const insets = useSafeAreaInsets();
  const cake = CAKES_BY_ID[route.params.id];
  return (
    <View style={styles.sheet}>
      <View style={styles.sheetHeader}>
        <Text style={text.caption}>Cake of the day</Text>
        <RoundButton icon="close" onPress={() => navigation.goBack()} />
      </View>
      <Photo
        cake={cake}
        tag={`gallery-special-${cake.id}`}
        style={styles.sheetPhoto}
      />
      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text style={[text.display, styles.title]}>{cake.name}</Text>
          <Stars />
        </View>
        <Text style={text.body}>{cake.description}</Text>
        <SizePicker />
      </View>
      <View style={[styles.footer, { paddingBottom: insets.bottom + 8 }]}>
        <Text style={styles.footerPrice}>{formatPrice(cake.price)}</Text>
        <PrimaryButton label="Pre-order" style={styles.footerButton} />
      </View>
    </View>
  );
}

const SIZES = ['Slice', 'Half', 'Whole'];

function SizePicker() {
  return (
    <View style={styles.sizes}>
      {SIZES.map((size, index) => (
        <View
          key={size}
          style={[styles.size, index === 0 && styles.selectedSize]}>
          <Text
            style={[styles.sizeText, index === 0 && styles.selectedSizeText]}>
            {size}
          </Text>
        </View>
      ))}
    </View>
  );
}

const GAP = 14;
const SIDE = 20;
const TILE_SIZE = (Dimensions.get('window').width - 2 * SIDE - GAP) / 2;
const HERO_SIZE = Dimensions.get('window').width - 2 * SIDE;

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.cream,
  },
  gallery: {
    flex: 1,
    paddingHorizontal: SIDE,
    backgroundColor: colors.cream,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  titles: {
    gap: 6,
  },
  special: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 12,
    paddingRight: 20,
    marginBottom: 20,
    borderRadius: 28,
    backgroundColor: colors.white,
    ...shadow,
  },
  specialPhoto: {
    width: 88,
    height: 88,
    borderRadius: 20,
  },
  specialText: {
    flex: 1,
    gap: 4,
  },
  price: {
    ...text.price,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: GAP,
    rowGap: 18,
  },
  tile: {
    width: TILE_SIZE,
    gap: 8,
  },
  tilePhoto: {
    width: TILE_SIZE,
    height: TILE_SIZE,
    borderRadius: 24,
  },
  tileLabel: {
    gap: 2,
    paddingHorizontal: 4,
  },
  tileName: {
    fontFamily: fonts.medium,
    fontSize: 15,
    color: colors.navy,
  },
  tilePrice: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.navySoft,
  },
  details: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  headerTitle: {
    ...text.name,
  },
  hero: {
    width: HERO_SIZE,
    height: HERO_SIZE,
    marginHorizontal: SIDE,
    borderRadius: 36,
  },
  body: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 22,
    gap: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    flexShrink: 1,
  },
  notes: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sizes: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  size: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: colors.peri,
  },
  selectedSize: {
    borderColor: colors.navy,
    backgroundColor: colors.navy,
  },
  sizeText: {
    fontFamily: fonts.medium,
    fontSize: 15,
    color: colors.navy,
  },
  selectedSizeText: {
    color: colors.white,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
    paddingHorizontal: 24,
  },
  footerPrice: {
    ...text.display,
    fontSize: 28,
  },
  footerButton: {
    flex: 1,
  },
  sheet: {
    flex: 1,
    paddingTop: 18,
    backgroundColor: colors.cream,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 24,
    paddingRight: SIDE,
    marginBottom: 14,
  },
  sheetPhoto: {
    width: HERO_SIZE,
    height: HERO_SIZE,
    marginHorizontal: SIDE,
    borderRadius: 36,
  },
});
