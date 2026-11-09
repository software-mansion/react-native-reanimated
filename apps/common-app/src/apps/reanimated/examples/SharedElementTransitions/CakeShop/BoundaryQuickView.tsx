import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, {
  SharedTransition,
  SharedTransitionBoundary,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Cake } from './cakes';
import { CAKES, formatPrice, SHOP_NAME } from './cakes';
import { SheetBackdrop, sheetStyles, useSheetBoundary } from './sheet';
import { colors, shadow, text } from './theme';
import {
  NoteChip,
  PrimaryButton,
  RoundButton,
  Stars,
  useHiddenAppHeader,
} from './ui';

const TRANSITION = SharedTransition.springify(600).dampingRatio(0.85);

export default function BoundaryQuickView() {
  useHiddenAppHeader();
  const insets = useSafeAreaInsets();
  const sheet = useSheetBoundary();
  const [cake, setCake] = useState<Cake | null>(null);

  const open = (selected: Cake) => {
    setCake(selected);
    sheet.open();
  };

  return (
    <View style={styles.screen}>
      <SharedTransitionBoundary isActive={!sheet.isActive}>
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingTop: insets.top + 12 },
          ]}>
          <Text style={text.caption}>{SHOP_NAME}</Text>
          <Text style={[text.display, styles.headline]}>One more slice?</Text>
          <View style={styles.grid}>
            {CAKES.map((item) => (
              <GridItem key={item.id} cake={item} onPress={() => open(item)} />
            ))}
          </View>
        </ScrollView>
      </SharedTransitionBoundary>
      <BottomSheet
        ref={sheet.ref}
        index={-1}
        snapPoints={['72%']}
        enableDynamicSizing={false}
        enablePanDownToClose
        backdropComponent={SheetBackdrop}
        backgroundStyle={sheetStyles.background}
        handleIndicatorStyle={sheetStyles.handle}
        {...sheet.sheetProps}>
        <BottomSheetView style={styles.sheetContent}>
          <SharedTransitionBoundary isActive={sheet.isActive}>
            {cake && (
              <QuickView
                cake={cake}
                showPhoto={sheet.hasLanded}
                onClose={sheet.close}
              />
            )}
          </SharedTransitionBoundary>
        </BottomSheetView>
      </BottomSheet>
    </View>
  );
}

function GridItem({ cake, onPress }: { cake: Cake; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.item}>
      <Animated.Image
        source={cake.image}
        sharedTransitionTag={`quick-view-${cake.id}`}
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

function QuickView({
  cake,
  showPhoto,
  onClose,
}: {
  cake: Cake;
  showPhoto: boolean;
  onClose: () => void;
}) {
  return (
    <View style={styles.quickView}>
      {showPhoto ? (
        <Animated.Image
          source={cake.image}
          sharedTransitionTag={`quick-view-${cake.id}`}
          sharedTransitionStyle={TRANSITION}
          style={styles.sheetPhoto}
        />
      ) : (
        <View style={styles.sheetPhoto} />
      )}
      <RoundButton icon="close" onPress={onClose} style={styles.closeButton} />
      <View style={styles.titleRow}>
        <Text style={text.title}>{cake.name}</Text>
        <Stars />
      </View>
      <Text style={text.body} numberOfLines={2}>
        {cake.description}
      </Text>
      <View style={styles.notes}>
        {cake.notes.map((note) => (
          <NoteChip key={note} label={note} />
        ))}
      </View>
      <PrimaryButton
        label={`Add to cart · ${formatPrice(cake.price)}`}
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
  sheetContent: {
    flex: 1,
  },
  quickView: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 32,
    gap: 12,
  },
  sheetPhoto: {
    width: '100%',
    height: 300,
    borderRadius: 32,
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 32,
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
