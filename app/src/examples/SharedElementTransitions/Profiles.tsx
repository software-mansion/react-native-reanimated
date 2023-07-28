import * as React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
  Image,
  FlatList,
  StatusBar,
  Platform,
} from 'react-native';
import {
  createNativeStackNavigator,
  NativeStackScreenProps,
} from '@react-navigation/native-stack';
import Animated, {
  FadeIn,
  runOnJS,
  SharedTransition,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useNavigation } from '@react-navigation/native';

const leavesBackground = require('./assets/nature/leaves.jpg');

const windowWidth = Dimensions.get('window').width;
const windowHeight = Dimensions.get('window').height;

type StackParamList = {
  Profiles: undefined;
  Home: { tag: Tag };
  Details: { item: any };
};

const springOptions = {
  damping: 15,
};

const transition = SharedTransition.custom((values) => {
  'worklet';
  return {
    width: withSpring(values.targetWidth, springOptions),
    height: withSpring(values.targetHeight, springOptions),
    originX: withSpring(values.targetOriginX, springOptions),
    originY: withSpring(values.targetOriginY, springOptions),
  };
});

const Stack = createNativeStackNavigator<StackParamList>();

const profiles = {
  dog: {
    image: require('./assets/avatars/dog.png'),
    title: 'Maria',
  },
  desert: {
    image: require('./assets/avatars/desert.png'),
    title: 'Alice',
  },
  cat: {
    image: require('./assets/avatars/cat.png'),
    title: 'James',
  },
  mountains: {
    image: require('./assets/avatars/mountains.png'),
    title: 'Jennifer',
  },
  parrot: {
    image: require('./assets/avatars/parrot.png'),
    title: 'Thomas',
  },
  wolf: {
    image: require('./assets/avatars/wolf.png'),
    title: 'Margaret',
  },
} as const;

type Tag = keyof typeof profiles;

function ProfilesScreen({
  navigation,
}: NativeStackScreenProps<StackParamList, 'Profiles'>) {
  const goToDetails = (tag: Tag) => {
    navigation.navigate('Home', { tag });
  };

  return (
    <View style={profilesStyles.container}>
      <StatusBar barStyle={'light-content'} />
      <Image source={leavesBackground} style={profilesStyles.backgroundImage} />
      <Text style={profilesStyles.header}>Welcome back!</Text>
      <View style={commonStyles.row}>
        {Object.keys(profiles).map((tag) => (
          <Pressable
            onPress={() => goToDetails(tag as Tag)}
            key={tag}
            style={profilesStyles.profileWrapper}>
            <Animated.Image
              sharedTransitionTag={tag}
              sharedTransitionStyle={transition}
              source={profiles[tag as Tag].image}
              style={profilesStyles.profile}
            />
            <Animated.Text
              sharedTransitionTag={`${tag}-text`}
              sharedTransitionStyle={transition}
              style={profilesStyles.profileLabel}>
              {profiles[tag as Tag].title}
            </Animated.Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const profilesStyles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === 'ios' ? 100 : 25,
    backgroundColor: '#000',
  },
  backgroundImage: {
    width: windowWidth,
    height: windowHeight,
    position: 'absolute',
    opacity: 0.6,
  },
  header: {
    fontSize: 35,
    textAlign: 'center',
    fontFamily: 'Poppins-Bold',
    color: '#f0fdf4',
    marginBottom: 20,
  },
  profileWrapper: {
    alignItems: 'center',
    marginHorizontal: 10,
    marginVertical: 15,
  },
  profile: {
    height: 150,
    width: 150,
    marginBottom: 8,
  },
  profileLabel: {
    fontFamily: 'Poppins-Medium',
    fontSize: 20,
    color: '#f0fdf4',
  },
});

// I totally made these names up, im sorry
// French names in the US Top 200 for girls include Annabelle, Charlotte, Claire, Josephine, and Sophie.
const lakes = [
  {
    image: require('./assets/nature/lake-1.jpg'),
    title: 'Lake Annabelle',
    id: 'lake-1',
  },
  {
    image: require('./assets/nature/lake-2.jpg'),
    title: 'Lake Charlotte',
    id: 'lake-2',
  },
  {
    image: require('./assets/nature/lake-3.jpg'),
    title: 'Lake Claire',
    id: 'lake-3',
  },
  {
    image: require('./assets/nature/lake-4.jpg'),
    title: 'Lake Josephine',
    id: 'lake-4',
  },
  {
    image: require('./assets/nature/lake-5.jpg'),
    title: 'Lake Sophie',
    id: 'lake-5',
  },
] as const;

// I made that up too
// https://en.natmus.dk/historical-knowledge/denmark/prehistoric-period-until-1050-ad/the-viking-age/the-people/names/
const forests = [
  {
    image: require('./assets/nature/forest-2.jpg'),
    title: 'Arne Forest',
    id: 'forest-1',
  },
  {
    image: require('./assets/nature/forest-4.jpg'),
    title: 'Birger Forest',
    id: 'forest-2',
  },
  {
    image: require('./assets/nature/forest-1.jpg'),
    title: 'Bjørn Forest',
    id: 'forest-3',
  },
  {
    image: require('./assets/nature/forest-3.jpg'),
    title: 'Halfdan Forest',
    id: 'forest-4',
  },
  {
    image: require('./assets/nature/forest-5.jpg'),
    title: 'Astrid Forest',
    id: 'forest-5',
  },
] as const;

function HomeScreen({
  route,
  navigation,
}: NativeStackScreenProps<StackParamList, 'Home'>) {
  const { tag } = route.params;

  return (
    <View style={homeStyles.container}>
      <StatusBar barStyle={'dark-content'} />

      <View style={homeStyles.headerContainer}>
        <Pressable
          style={homeStyles.pressable}
          onPress={() => navigation.goBack()}>
          <Text style={homeStyles.title}>Home</Text>
          <Animated.Image
            sharedTransitionTag={tag}
            sharedTransitionStyle={transition}
            source={profiles[tag as Tag].image}
            style={homeStyles.profile}
          />
          <Animated.Text
            sharedTransitionTag={`${tag}-text`}
            sharedTransitionStyle={transition}
          />
        </Pressable>
      </View>
      <Text style={homeStyles.subTitle}>Lakes</Text>
      <FlatList
        data={lakes}
        style={homeStyles.margin}
        showsHorizontalScrollIndicator={false}
        renderItem={({ item }) => {
          return (
            <Pressable
              style={homeStyles.marginHorizontal}
              onPress={() => {
                navigation.navigate('Details', { item });
              }}>
              <Animated.Image
                sharedTransitionTag={item.id}
                source={item.image}
                style={homeStyles.image}
              />
              <Animated.Text style={homeStyles.imageLabel}>
                {item.title}
              </Animated.Text>
            </Pressable>
          );
        }}
        keyExtractor={(item) => item.id}
        horizontal={true}
      />

      <Text style={homeStyles.subTitle}>Forests</Text>
      <FlatList
        data={forests}
        style={homeStyles.margin}
        showsHorizontalScrollIndicator={false}
        renderItem={({ item }) => {
          return (
            <Pressable
              style={homeStyles.marginHorizontal}
              onPress={() => {
                navigation.navigate('Details', { item });
              }}>
              <Animated.Image
                sharedTransitionTag={item.id}
                source={item.image}
                style={homeStyles.image}
              />
              <Animated.Text style={homeStyles.imageLabel}>
                {item.title}
              </Animated.Text>
            </Pressable>
          );
        }}
        keyExtractor={(item) => item.id}
        horizontal={true}
      />
    </View>
  );
}

const homeStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  headerContainer: {
    height: Platform.OS === 'ios' ? 120 : 80,
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 25,
  },
  pressable: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  profile: {
    height: 45,
    width: 45,
  },
  image: {
    height: 200,
    width: 150,
    marginBottom: 8,
    borderRadius: 10,
  },
  imageLabel: {
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    color: '#1e293b',
  },
  title: {
    fontSize: 40,
    flex: 1,
    color: '#1e293b',
    fontFamily: 'Poppins-Medium',
  },
  subTitle: {
    fontSize: 24,
    fontFamily: 'Poppins-Medium',
    color: '#334155',
    marginBottom: 15,
    marginLeft: 20,
  },
  margin: {
    marginLeft: 10,
  },
  marginHorizontal: {
    marginHorizontal: 10,
  },
});

const FLING_LIMIT = 160;

function DetailsScreen({
  route,
  navigation,
}: NativeStackScreenProps<StackParamList, 'Details'>) {
  const { item } = route.params;

  const translation = {
    x: useSharedValue(0),
    y: useSharedValue(0),
  };
  const runOnlyOnce = useSharedValue(false);

  const goBack = () => {
    navigation.goBack();
  };

  const pan = Gesture.Pan()
    .onChange((event) => {
      translation.x.value += event.changeX;
      translation.y.value += event.changeY;

      if (
        event.translationY > FLING_LIMIT ||
        event.translationY < -FLING_LIMIT ||
        event.translationX > FLING_LIMIT ||
        event.translationX < -FLING_LIMIT
      ) {
        if (!runOnlyOnce.value) {
          runOnlyOnce.value = true;
          runOnJS(goBack)();
        }
      }
    })
    .onFinalize(() => {
      translation.x.value = withSpring(0, springOptions);
      translation.y.value = withSpring(0, springOptions);
    });

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translation.x.value },
        { translateY: translation.y.value },
        // prettier-ignore
        { scale: 1 - (Math.abs(translation.x.value) + Math.abs(translation.y.value)) / 1000 },
      ],
    };
  });

  return (
    <>
      <StatusBar barStyle={'dark-content'} />
      <GestureDetector gesture={pan}>
        <Animated.View style={[detailStyles.container, animatedStyle]}>
          <Animated.Image
            sharedTransitionTag={item.id}
            source={item.image}
            style={detailStyles.image}
          />
          <Animated.View
            style={detailStyles.background}
            entering={FadeIn.delay(50).duration(600)}>
            <Animated.Text
              entering={FadeIn.delay(200).duration(1000)}
              style={detailStyles.title}>
              {item.title}
            </Animated.Text>
            <Animated.Text
              entering={FadeIn.delay(400).duration(1000)}
              style={detailStyles.description}>
              Nature is a symphony of sights, sounds, and sensations that awaken
              our senses and nourish our souls. From the gentle rustling of
              leaves in the breeze to the awe-inspiring grandeur of towering
              mountains, nature is a masterpiece that never ceases to amaze us.
            </Animated.Text>
            <Animated.View
              entering={FadeIn.delay(800).duration(1000)}
              style={detailStyles.callToActionWrapper}>
              <Pressable
                style={detailStyles.callToAction}
                onPress={() => navigation.goBack()}>
                <Text style={detailStyles.callToActionText}>Looks good!</Text>
              </Pressable>
            </Animated.View>
          </Animated.View>
        </Animated.View>
      </GestureDetector>
    </>
  );
}

const detailStyles = StyleSheet.create({
  container: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  background: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  image: {
    height: 300,
    width: 500,
  },
  description: {
    fontSize: 16,
    marginTop: 8,
    fontFamily: 'Poppins-Regular',
    marginHorizontal: 20,
    color: '#1e293b',
  },
  title: {
    fontSize: 40,
    color: '#0f172a',
    fontFamily: 'Poppins-Medium',
    marginHorizontal: 20,
    marginTop: 15,
    marginBottom: 20,
  },
  callToActionWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 30,
  },
  callToAction: {
    backgroundColor: '#0f172a',
    padding: 16,
    width: 250,
    borderRadius: 5,
  },
  callToActionText: {
    color: '#f8fafc',
    fontFamily: 'Poppins-Bold',
    textAlign: 'center',
    textTransform: 'uppercase',
    fontSize: 16,
  },
});

export default function ProfilesExample() {
  // hide header of parent stack
  const navigation = useNavigation();
  React.useLayoutEffect(() => {
    if (Platform.OS !== 'web') {
      navigation.setOptions({ headerShown: false });
    }
  }, [navigation]);

  const shouldReduceMotion = useReducedMotion();

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="Profiles"
        component={ProfilesScreen}
        options={{ animation: shouldReduceMotion ? 'fade' : 'default' }}
      />
      <Stack.Screen
        name="Home"
        component={HomeScreen}
        options={{ animation: shouldReduceMotion ? 'fade' : 'default' }}
      />
      <Stack.Screen
        name="Details"
        component={DetailsScreen}
        options={{
          animation: 'fade',
          presentation: 'transparentModal',
          headerShown: false,
        }}
      />
    </Stack.Navigator>
  );
}

const commonStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
});
