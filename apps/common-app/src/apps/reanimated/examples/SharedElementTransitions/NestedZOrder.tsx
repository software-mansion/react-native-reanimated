import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { SharedTransition } from 'react-native-reanimated';

import { withSharedTransitionBoundary } from './withSharedTransitionBoundary';

const DURATION = 1500;

const VARIANTS = {
  plain: {
    card: SharedTransition.duration(DURATION),
    photo: SharedTransition.duration(DURATION),
  },
  fadeContent: {
    card: SharedTransition.duration(DURATION).fadeContent(),
    photo: SharedTransition.duration(DURATION),
  },
};

type Variant = keyof typeof VARIANTS;

type ParamList = {
  Cards: undefined;
  Details: { variant: Variant };
};

const DESCRIPTION =
  'The card and the blue photo have their own shared tags. The yellow label is a plain child of the card, drawn above the photo. It should stay above the photo during the transition.';

const Stack = createNativeStackNavigator<ParamList>();

function CardsContent({
  navigation,
}: NativeStackScreenProps<ParamList, 'Cards'>) {
  return (
    <View style={styles.cards}>
      <Text style={styles.description}>{DESCRIPTION}</Text>
      <View style={styles.row}>
        {(Object.keys(VARIANTS) as Variant[]).map((variant) => (
          <Pressable
            key={variant}
            testID={`card-${variant}`}
            onPress={() => navigation.navigate('Details', { variant })}>
            <Animated.View
              sharedTransitionTag={`zorder-card-${variant}`}
              sharedTransitionStyle={VARIANTS[variant].card}
              style={styles.smallCard}>
              <Animated.View
                sharedTransitionTag={`zorder-photo-${variant}`}
                sharedTransitionStyle={VARIANTS[variant].photo}
                style={styles.smallPhoto}
              />
              <View style={styles.smallLabel}>
                <Text style={styles.smallLabelText}>LABEL</Text>
              </View>
            </Animated.View>
            <Text style={styles.variantName}>{variant}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function DetailsContent({
  route,
  navigation,
}: NativeStackScreenProps<ParamList, 'Details'>) {
  const { variant } = route.params;
  return (
    <Pressable
      testID="details"
      style={styles.details}
      onPress={() => navigation.goBack()}>
      <Animated.View
        sharedTransitionTag={`zorder-card-${variant}`}
        sharedTransitionStyle={VARIANTS[variant].card}
        style={styles.largeCard}>
        <Animated.View
          sharedTransitionTag={`zorder-photo-${variant}`}
          sharedTransitionStyle={VARIANTS[variant].photo}
          style={styles.largePhoto}
        />
        <View style={styles.largeLabel}>
          <Text style={styles.largeLabelText}>LABEL</Text>
        </View>
      </Animated.View>
      <Text style={styles.description}>Tap anywhere to go back</Text>
    </Pressable>
  );
}

const Cards = withSharedTransitionBoundary(CardsContent);
const Details = withSharedTransitionBoundary(DetailsContent);

export default function NestedZOrderExample() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Cards" component={Cards} />
      <Stack.Screen name="Details" component={Details} />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  cards: { flex: 1, padding: 16, paddingTop: 100, backgroundColor: 'white' },
  description: { fontSize: 15, lineHeight: 21, marginVertical: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-around' },
  variantName: { marginTop: 8, textAlign: 'center', fontSize: 15 },
  smallCard: {
    width: 150,
    height: 190,
    padding: 12,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#2b2b2b',
  },
  smallPhoto: { width: 126, height: 126, backgroundColor: '#1e6fd9' },
  smallLabel: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 12,
    height: 76,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffd60a',
  },
  smallLabelText: { fontSize: 18, fontWeight: 'bold', color: 'black' },
  details: {
    flex: 1,
    padding: 16,
    paddingTop: 120,
    backgroundColor: 'white',
  },
  largeCard: {
    height: 440,
    padding: 16,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#2b2b2b',
  },
  largePhoto: { height: 320, backgroundColor: '#1e6fd9' },
  largeLabel: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
    height: 160,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffd60a',
  },
  largeLabelText: { fontSize: 40, fontWeight: 'bold', color: 'black' },
});
