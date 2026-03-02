import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as React from 'react';
import { Dimensions, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  FadeInDown,
  FadeInLeft,
  FadeInUp,
} from 'react-native-reanimated';

// Image by <a href="https://www.freepik.com/free-photo/tasty-coffee-cups-with-foam-arrangement_29301184.htm#&position=16&from_view=collections">Freepik</a>
// Image by <a href="https://www.freepik.com/free-photo/coffee-cups-wooden-boards-assortment_29301210.htm#&position=42&from_view=collections">Freepik</a>
// Image by <a href="https://www.freepik.com/free-photo/delicious-coffee-glasses-arrangement_29301185.htm#&position=17&from_view=collections">Freepik</a>
// Image by <a href="https://www.freepik.com/free-photo/coffee-cup-wooden-boards-arrangement_29301195.htm#&position=27&from_view=collections">Freepik</a>
import coffeeImage from './assets/coffee/coffee.png';
import espressoImage from './assets/coffee/coffee_espresso.png';
import latteImage from './assets/coffee/coffee_latte.png';
import { withSharedTransitionBoundary } from './withSharedTransitionBoundary';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const BACKGROUND = '#fff';
const BACKGROUND_NEUTRAL = '#f4f4f4';
const ACCENT_BACKGROUND = '#dac9be';
const ACCENT = '#ba8638';
const TEXT = '#222325';
const TEXT_SECONDARY = '#aeacae';

const windowWidth = Dimensions.get('window').width;

type StackParamList = {
  Home: undefined;
  Details: { tag: string };
};

const DATA = [
  {
    id: 'coffee',
    label: 'Caffè crema',
    source: coffeeImage,
    description:
      'Where robust espresso is beautifully blanketed with a cap of rich cream froth, delivering the perfect match of intensity and smoothness to your doorstep.',
  },
  {
    id: 'espresso',
    label: 'Espresso',
    source: espressoImage,
    description:
      'Bold and pure delight. Crafted with precision to offer you a condensed sip of strong, highly concentrated coffee flavor.',
  },
  {
    id: 'latte',
    label: 'Caffè latte',
    source: latteImage,
    description:
      'A harmonious blend of expertly extracted espresso and creamy, frothed milk that will caress your palate with its velvety texture and balanced flavor.',
  },
];

const Stack = createNativeStackNavigator<StackParamList>();

function HomeScreenContent({
  navigation,
}: NativeStackScreenProps<StackParamList, 'Home'>) {
  return (
    <Animated.View style={homeStyles.background}>
      {/* <StatusBar barStyle="dark-content" animated /> */}
      <Animated.Text
        style={homeStyles.headline}
        entering={FadeInUp.delay(150).duration(600)}>
        Choose your adventure
      </Animated.Text>
      <View style={homeStyles.wrapper}>
        {DATA.map((item, i) => (
          <Pressable
            key={item.id}
            style={homeStyles.container}
            onPress={() =>
              navigation.navigate('Details', {
                tag: item.id,
              })
            }>
            <Animated.View
              sharedTransitionTag={`${item.id}-wrapper`}
              entering={FadeInUp.delay(300 * i + 300).duration(600)}
              style={homeStyles.imageWrapper}>
              <Animated.Image
                sharedTransitionTag={item.id}
                source={item.source}
                style={homeStyles.image}
              />
            </Animated.View>
            <View style={homeStyles.margin}>
              <Animated.Text
                style={homeStyles.label}
                entering={FadeInLeft.delay(300 * i + 300).duration(600)}>
                {item.label}
              </Animated.Text>
              <Animated.Text
                numberOfLines={1}
                style={homeStyles.description}
                entering={FadeInLeft.delay(300 * i + 300).duration(900)}>
                {item.description}
              </Animated.Text>
            </View>
          </Pressable>
        ))}
      </View>
    </Animated.View>
  );
}

const homeStyles = StyleSheet.create({
  background: {
    backgroundColor: BACKGROUND,
    flex: 1,
    paddingTop: 64,
  },
  wrapper: {
    marginHorizontal: 16,
    marginTop: 32,
  },
  headline: {
    fontSize: 32,
    color: TEXT,
    textAlign: 'center',
  },
  image: {
    width: 150,
    height: 150,
  },
  imageWrapper: {
    width: 150,
    height: 80,
    backgroundColor: ACCENT_BACKGROUND,
    borderRadius: 200,
    marginVertical: 50,
    justifyContent: 'flex-end',
  },
  label: {
    fontSize: 28,
    color: TEXT,
    marginBottom: 8,
  },
  description: {
    color: TEXT_SECONDARY,
    width: 170,
  },
  container: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 16,
  },
  margin: {
    marginBottom: 32,
  },
});

function DetailsScreenContent({
  navigation,
  route,
}: NativeStackScreenProps<StackParamList, 'Details'>) {
  const { tag } = route.params;

  const item = DATA.find((item) => item.id === tag);

  const source = item?.source;
  const label = item?.label;
  const description = item?.description;

  return (
    <View style={detailStyles.background}>
      <Animated.View
        style={detailStyles.imageWrapper}
        sharedTransitionTag={`${tag}-wrapper`}>
        <Animated.Image
          sharedTransitionTag={tag}
          source={source}
          style={detailStyles.image}
        />
      </Animated.View>
      <View style={detailStyles.container}>
        <View>
          <View style={[detailStyles.priceWrapper, detailStyles.margin]}>
            <Animated.Text
              style={detailStyles.header}
              entering={FadeInDown.delay(200)}>
              {label}
            </Animated.Text>
            <Animated.Text
              entering={FadeInDown.delay(200)}
              style={detailStyles.price}>
              $12
            </Animated.Text>
          </View>
          <Animated.Text
            style={[detailStyles.description, detailStyles.margin]}
            entering={FadeInDown.delay(300)}>
            {description}
          </Animated.Text>
        </View>
        <View>
          <Animated.View
            entering={FadeInDown.delay(400)}
            style={detailStyles.picker}>
            <Text
              style={[
                detailStyles.pickerItem,
                detailStyles.pickerItemSelected,
              ]}>
              Small
            </Text>
            <Text style={detailStyles.pickerItem}>Medium</Text>
            <Text style={detailStyles.pickerItem}>Large</Text>
          </Animated.View>
          <AnimatedPressable
            entering={FadeInDown.delay(500)}
            style={detailStyles.callToAction}
            onPress={() => navigation.goBack()}>
            <Text style={detailStyles.callToActionText}>add to cart</Text>
          </AnimatedPressable>
        </View>
      </View>
    </View>
  );
}

const detailStyles = StyleSheet.create({
  background: {
    backgroundColor: BACKGROUND,
    flex: 1,
  },
  imageWrapper: {
    width: windowWidth,
    height: windowWidth * 0.8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ACCENT_BACKGROUND,
  },
  image: {
    width: 270,
    height: 270,
  },
  header: {
    fontSize: 46,
    color: TEXT,
  },
  price: {
    fontSize: 46,
    color: ACCENT,
  },
  priceWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  description: {
    color: TEXT_SECONDARY,
    fontSize: 16,
  },
  callToAction: {
    backgroundColor: 'black',
    padding: 16,
    borderRadius: 50,
    width: '100%',
    marginBottom: 48,
  },
  callToActionText: {
    color: 'white',
    textAlign: 'center',
    textTransform: 'uppercase',
    fontSize: 22,
    fontWeight: 'bold',
  },
  margin: {
    marginBottom: 24,
  },
  container: {
    flex: 1,
    marginHorizontal: 16,
    marginTop: 32,
    justifyContent: 'space-between',
  },
  picker: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
    backgroundColor: BACKGROUND_NEUTRAL,
    borderRadius: 20,
  },
  pickerItem: {
    padding: 8,
    width: 90,
    borderRadius: 20,
    textAlign: 'center',
  },
  pickerItemSelected: {
    borderWidth: 1,
    borderColor: TEXT,
  },
});

const HomeScreen = withSharedTransitionBoundary(HomeScreenContent);
const DetailsScreen = withSharedTransitionBoundary(DetailsScreenContent);

export default function ProgressTransitionExample() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="Details" component={DetailsScreen} />
    </Stack.Navigator>
  );
}
