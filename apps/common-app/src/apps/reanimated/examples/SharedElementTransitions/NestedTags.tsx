import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import type { ImageSourcePropType } from 'react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { SharedTransition } from 'react-native-reanimated';

import cat from './assets/avatars/cat.png';
import dog from './assets/avatars/dog.png';
import parrot from './assets/avatars/parrot.png';
import wolf from './assets/avatars/wolf.png';
import { withSharedTransitionBoundary } from './withSharedTransitionBoundary';

type Card = {
  id: string;
  title: string;
  subtitle: string;
  color: string;
  icon: ImageSourcePropType;
};

type ParamList = {
  List: undefined;
  Details: { card: Card };
};

const CARDS: Card[] = [
  {
    id: 'cat',
    title: 'Cat',
    subtitle: 'Sleeps all day',
    color: '#f08c2a',
    icon: cat,
  },
  {
    id: 'dog',
    title: 'Dog',
    subtitle: 'Wants a walk',
    color: '#3a7bd5',
    icon: dog,
  },
  {
    id: 'parrot',
    title: 'Parrot',
    subtitle: 'Talks a lot',
    color: '#2e9e5b',
    icon: parrot,
  },
  {
    id: 'wolf',
    title: 'Wolf',
    subtitle: 'Lives in the forest',
    color: '#7b4fc9',
    icon: wolf,
  },
];

const DESCRIPTION =
  'The card and the icon have their own shared tags. The spring of the icon ends first.';

const cardTransition = SharedTransition.springify();
const iconTransition = SharedTransition.springify(350);

const Stack = createNativeStackNavigator<ParamList>();

function ListContent({
  navigation,
}: NativeStackScreenProps<ParamList, 'List'>) {
  return (
    <View style={styles.list}>
      {CARDS.map((card) => (
        <Pressable
          key={card.id}
          testID={`card-${card.id}`}
          onPress={() => navigation.navigate('Details', { card })}>
          <Animated.View
            sharedTransitionTag={`card-${card.id}`}
            sharedTransitionStyle={cardTransition}
            style={[styles.listCard, { backgroundColor: card.color }]}>
            <Animated.Image
              sharedTransitionTag={`icon-${card.id}`}
              sharedTransitionStyle={iconTransition}
              source={card.icon}
              style={styles.listIcon}
            />
            <View>
              <Text style={styles.listTitle}>{card.title}</Text>
              <Text style={styles.subtitle}>{card.subtitle}</Text>
            </View>
          </Animated.View>
        </Pressable>
      ))}
    </View>
  );
}

function DetailsContent({
  route,
  navigation,
}: NativeStackScreenProps<ParamList, 'Details'>) {
  const { card } = route.params;
  return (
    <Pressable style={styles.details} onPress={() => navigation.goBack()}>
      <Animated.View
        sharedTransitionTag={`card-${card.id}`}
        sharedTransitionStyle={cardTransition}
        style={[styles.detailsCard, { backgroundColor: card.color }]}>
        <Animated.Image
          sharedTransitionTag={`icon-${card.id}`}
          sharedTransitionStyle={iconTransition}
          source={card.icon}
          style={styles.detailsIcon}
        />
        <Text style={styles.detailsTitle}>{card.title}</Text>
        <Text style={styles.subtitle}>Tap anywhere to go back</Text>
      </Animated.View>
      <Text style={styles.body}>{DESCRIPTION}</Text>
    </Pressable>
  );
}

const List = withSharedTransitionBoundary(ListContent);
const Details = withSharedTransitionBoundary(DetailsContent);

export default function NestedTagsExample() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="List" component={List} />
      <Stack.Screen name="Details" component={Details} />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
    padding: 16,
    paddingTop: 100,
    gap: 12,
    backgroundColor: 'white',
  },
  listCard: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 88,
    overflow: 'hidden',
    borderRadius: 16,
    paddingHorizontal: 16,
    gap: 12,
  },
  listIcon: { width: 56, height: 56 },
  listTitle: { fontSize: 20, fontWeight: 'bold', color: 'white' },
  details: { flex: 1, padding: 16, backgroundColor: 'white' },
  detailsCard: {
    height: 300,
    overflow: 'hidden',
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  detailsIcon: { width: 140, height: 140 },
  detailsTitle: { fontSize: 32, fontWeight: 'bold', color: 'white' },
  subtitle: { fontSize: 14, color: '#ffffffcc' },
  body: { marginTop: 16, fontSize: 17, lineHeight: 24 },
});
