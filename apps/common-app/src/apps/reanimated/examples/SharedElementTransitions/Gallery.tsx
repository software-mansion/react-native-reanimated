import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as React from 'react';
import { Dimensions, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, cubicBezier } from 'react-native-reanimated';

import florence from './assets/florence.jpg';
import countryside from './assets/countryside.jpg';
import dawn from './assets/dawn.jpg';
import { withSharedTransitionBoundary } from './withSharedTransitionBoundary';

type StackParamList = {
  Home: undefined;
  Details: { tag: Tag };
};

const Stack = createNativeStackNavigator<StackParamList>();

const gallery = {
  florence: {
    image: florence,
    title: 'Beautiful city of Florence',
    description:
      'Florence was a centre of medieval European trade and finance and one of the wealthiest cities of that era.',
  },
  countryside: {
    image: countryside,
    title: 'Tuscan countryside',
    description:
      "Tuscany's picturesque hills attract millions of tourists each year craving postcard-perfect views.",
  },
  dawn: {
    image: dawn,
    title: 'Tuscany at dawn',
    description:
      'Tuscany is known for its magical mists in the morning and at sunset.',
  },
};

type Tag = keyof typeof gallery;

function HomeScreenContent({
  navigation,
}: NativeStackScreenProps<StackParamList, 'Home'>) {
  const chips = ['Italy', 'Tourism', 'Nature'];
  const goToDetails = (tag: Tag) => {
    navigation.navigate('Details', { tag });
  };

  const { width } = Dimensions.get('screen');

  return (
    <Animated.ScrollView style={styles.homeContainer}>
      <Pressable onPress={() => goToDetails('countryside')}>
        <Animated.Image
          sharedTransitionTag={'countryside'}
          source={gallery.countryside.image}
          style={styles.imageOne}
        />
      </Pressable>
      <View style={styles.row}>
        <Pressable onPress={() => goToDetails('florence')}>
          <Animated.Image
            sharedTransitionTag={'florence'}
            source={gallery.florence.image}
            style={[{ width: width / 2 - 35 }, styles.imageTwo]}
          />
        </Pressable>
        <Pressable onPress={() => goToDetails('dawn')}>
          <Animated.Image
            sharedTransitionTag={'dawn'}
            source={gallery.dawn.image}
            style={[{ width: width / 2 - 35 }, styles.imageThree]}
          />
        </Pressable>
      </View>
      <Text style={styles.header}>Tuscany</Text>
      <View style={styles.row}>
        {chips.map((chip) => (
          <Text key={chip} style={styles.chip}>
            {chip}
          </Text>
        ))}
      </View>
      <Text style={styles.text}>
        Tuscany is known for its landscapes, history, artistic legacy, and its
        influence on high culture. It is regarded as the birthplace of the
        Italian Renaissance and of the foundations of the Italian language.
      </Text>
      <View style={styles.newArchEnabledContainer}>
        <View style={styles.indicatorContainer}>
          <Animated.View
            style={[
              styles.indicator,
              {
                animationName: {
                  '75%, 100%': {
                    transform: [{ scale: 2 }],
                    opacity: 0,
                  },
                },
                animationDuration: '1s',
                animationTimingFunction: cubicBezier(0, 0, 0.2, 1),
                animationIterationCount: 'infinite',
              },
            ]}></Animated.View>
          <View style={styles.indicator}></View>
        </View>
        <Text style={styles.indicatorText}>New Architecture Enabled</Text>
      </View>
    </Animated.ScrollView>
  );
}

function DetailsScreenContent({
  route,
  navigation,
}: NativeStackScreenProps<StackParamList, 'Details'>) {
  const { tag } = route.params;

  return (
    <View style={styles.detailContainer}>
      <Animated.Image
        sharedTransitionTag={tag}
        source={gallery[tag].image}
        style={styles.detailsImage}
      />
      <View style={styles.wrapper}>
        <Animated.Text
          entering={FadeIn.delay(150).duration(1000)}
          style={[styles.header, styles.font28]}>
          {gallery[tag].title}
        </Animated.Text>
        <Animated.Text
          entering={FadeIn.delay(300).duration(1000)}
          style={styles.text}>
          {gallery[tag].description}
        </Animated.Text>
        <Animated.View
          entering={FadeIn.delay(500).duration(1000)}
          style={styles.callToActionWrapper}>
          <Pressable
            style={styles.callToAction}
            onPress={() => navigation.goBack()}>
            <Text style={styles.callToActionText}>see for yourself</Text>
          </Pressable>
        </Animated.View>
      </View>
    </View>
  );
}

const HomeScreen = withSharedTransitionBoundary(HomeScreenContent);
const DetailsScreen = withSharedTransitionBoundary(DetailsScreenContent);

export default function GalleryExample() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}>
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="Details" component={DetailsScreen} />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  homeContainer: {
    flex: 1,
    marginHorizontal: 25,
  },
  detailContainer: {
    flex: 1,
  },
  wrapper: {
    flex: 1,
    marginHorizontal: 25,
  },
  row: {
    flexDirection: 'row',
  },
  header: {
    fontSize: 40,
    fontWeight: 'bold',
    marginTop: 25,
    marginBottom: 12,
  },
  text: {
    fontSize: 16,
    marginTop: 8,
  },
  font28: {
    fontSize: 28,
  },
  chip: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 8,
    width: 90,
    borderRadius: 5,
    textAlign: 'center',
    marginRight: 8,
  },
  detailsImage: {
    width: '100%',
    height: 400,
  },
  callToActionWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 30,
  },
  callToAction: {
    backgroundColor: '#add8e6',
    padding: 16,
    width: 250,
    borderRadius: 5,
  },
  callToActionText: {
    color: '#015571',
    textAlign: 'center',
    textTransform: 'uppercase',
    fontSize: 16,
    fontWeight: 'bold',
  },
  imageOne: {
    width: '100%',
    height: 160,
    marginTop: 20,
    borderRadius: 15,
  },
  imageTwo: {
    height: 250,
    marginTop: 20,
    borderRadius: 15,
  },
  imageThree: {
    height: 250,
    marginTop: 20,
    marginLeft: 20,
    borderRadius: 15,
  },
  newArchEnabledContainer: {
    padding: 16,
    marginTop: 20,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  indicatorContainer: {
    marginRight: 28,
  },
  indicator: {
    marginTop: 2,
    width: 14,
    height: 14,
    backgroundColor: '#22c55e',
    borderRadius: 99,
    position: 'absolute',
  },
  indicatorText: {
    fontSize: 16,
    color: '#16a34a',
    fontWeight: 'bold',
  },
});
