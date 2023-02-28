import * as React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
  ImageBackground,
  Image,
} from 'react-native';
import {
  createNativeStackNavigator,
  NativeStackScreenProps,
} from '@react-navigation/native-stack';
import Animated, {
  FadeIn,
  SharedTransition,
  withSpring,
} from 'react-native-reanimated';

// const florence = require('./assets/florence.jpg');
// const countryside = require('./assets/countryside.jpg');
// const dawn = require('./assets/dawn.jpg');
const nature = require('./assets/nature.jpg');

const dogge = require('./assets/dogge-avatar.png');
const desert = require('./assets/desert-avatar.png');
const kitty = require('./assets/kitty-avatar.png');
const mountains = require('./assets/mountains-avatar.png');
const parrot = require('./assets/parrot-avatar.png');
const wolf = require('./assets/wolf-avatar.png');

type StackParamList = {
  Profiles: undefined;
  Home: { tag: Tag };
};

const transition = SharedTransition.custom((values) => {
  'worklet';
  return {
    width: withSpring(values.targetWidth),
    height: withSpring(values.targetHeight),
    originX: withSpring(values.targetOriginX),
    originY: withSpring(values.targetOriginY),
  };
});

const Stack = createNativeStackNavigator<StackParamList>();

const profiles = {
  dogge: {
    image: dogge,
    title: 'Maria',
  },
  desert: {
    image: desert,
    title: 'Alice',
  },
  kitty: {
    image: kitty,
    title: 'James',
  },
  mountains: {
    image: mountains,
    title: 'Jennifer',
  },
  parrot: {
    image: parrot,
    title: 'Thomas',
  },
  wolf: {
    image: wolf,
    title: 'Margaret',
  },
};

type Tag = keyof typeof profiles;

function ProfilesScreen({
  navigation,
}: NativeStackScreenProps<StackParamList, 'Profiles'>) {
  const goToDetails = (tag: Tag) => {
    navigation.navigate('Home', { tag });
  };

  const windowWidth = Dimensions.get('window').width;
  const windowHeight = Dimensions.get('window').height;

  return (
    <View style={styles.homeContainer}>
      <Image
        source={nature}
        style={{
          width: windowWidth,
          height: windowHeight,
          position: 'absolute',
          opacity: 0.6,
        }}
      />
      <Text
        style={{
          fontSize: 35,
          textAlign: 'center',
          fontFamily: 'Poppins-Bold',
          color: '#f0fdf4',
          marginBottom: 20,
        }}>
        Welcome back!
      </Text>
      <View style={styles.row}>
        {Object.keys(profiles).map((tag) => (
          <Pressable
            onPress={() => goToDetails(tag as Tag)}
            style={{
              alignItems: 'center',
              marginHorizontal: 10,
              marginVertical: 15,
            }}>
            <Animated.Image
              sharedTransitionTag={tag}
              sharedTransitionStyle={transition}
              source={profiles[tag as Tag].image}
              style={{
                height: 150,
                width: 150,
                marginBottom: 8,
              }}
            />
            <Animated.Text
              sharedTransitionTag={`${tag}-text`}
              sharedTransitionStyle={transition}
              style={{
                fontFamily: 'Poppins-Medium',
                fontSize: 20,
                color: '#f0fdf4',
              }}>
              {profiles[tag as Tag].title}
            </Animated.Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function HomeScreen({
  route,
  navigation,
}: NativeStackScreenProps<StackParamList, 'Home'>) {
  const { tag } = route.params;

  return (
    <View style={styles.detailContainer}>
      <View
        style={{
          height: 120,
          alignItems: 'flex-end',
          // alignContent: 'flex-end',
          justifyContent: 'space-between',
          flexDirection: 'row',
          paddingHorizontal: 16,
          marginBottom: 25,
        }}>
        <Pressable
          style={{
            flexDirection: 'row',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
          }}
          onPress={() => navigation.goBack()}>
          <Text
            style={{
              ...styles.header,
              fontSize: 40,
              flex: 1,
              color: '#064e3b',
            }}>
            Home
          </Text>
          <Animated.Image
            sharedTransitionTag={tag}
            sharedTransitionStyle={transition}
            source={profiles[tag as Tag].image}
            style={{
              height: 45,
              width: 45,
            }}
          />
          <Animated.Text
            sharedTransitionTag={`${tag}-text`}
            sharedTransitionStyle={transition}
          />
        </Pressable>
      </View>
    </View>
  );
}

export default function ProfilesExample() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Profiles" component={ProfilesScreen} />
      <Stack.Screen name="Home" component={HomeScreen} />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  homeContainer: {
    flex: 1,
    // marginHorizontal: 25,
    paddingTop: 100,
    backgroundColor: '#000',
    // alignItems: 'center',
  },
  detailContainer: {
    flex: 1,
    backgroundColor: '#fafaf9',
  },
  wrapper: {
    flex: 1,
    marginHorizontal: 25,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  header: {
    fontSize: 40,
    // fontWeight: 'bold',
    fontFamily: 'Poppins-Bold',
  },
  text: {
    fontSize: 16,
    marginTop: 8,
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
});
