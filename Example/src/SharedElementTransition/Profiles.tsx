import * as React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
  ImageBackground,
  Image,
  FlatList,
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

const lake1 = require('./assets/lake-1.jpg');
const lake2 = require('./assets/lake-2.jpg');
const lake3 = require('./assets/lake-3.jpg');
const lake4 = require('./assets/lake-4.jpg');
const lake5 = require('./assets/lake-5.jpg');

const forrest1 = require('./assets/forrest-1.jpg');
const forrest2 = require('./assets/forrest-2.jpg');
const forrest3 = require('./assets/forrest-3.jpg');
const forrest4 = require('./assets/forrest-4.jpg');
const forrest5 = require('./assets/forrest-5.jpg');

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

// const lakes = {
//   lake1: {
//     image: lake1,
//     title: 'Lake 1',
//   },
//   lake2: {
//     image: lake2,
//     title: 'Lake 2',
//   },
//   lake3: {
//     image: lake3,
//     title: 'Lake 3',
//   },
//   lake4: {
//     image: lake4,
//     title: 'Lake 4',
//   },
//   lake5: {
//     image: lake5,
//     title: 'Lake 5',
//   },
// };

// I totally made these names up, im sorry
// French names in the US Top 200 for girls include Annabelle, Charlotte, Claire, Josephine, and Sophie.
const lakes = [
  {
    image: lake3,
    title: 'Lake Annabelle',
    id: 'lake-1',
  },
  {
    image: lake2,
    title: 'Lake Charlotte',
    id: 'lake-2',
  },
  {
    image: lake1,
    title: 'Lake Claire',
    id: 'lake-3',
  },
  {
    image: lake4,
    title: 'Lake Claire',
    id: 'lake-4',
  },
  {
    image: lake5,
    title: 'Lake Sophie',
    id: 'lake-5',
  },
];

// I made that up too
// https://en.natmus.dk/historical-knowledge/denmark/prehistoric-period-until-1050-ad/the-viking-age/the-people/names/
const forrests = [
  {
    image: forrest2,
    title: 'Arne Forrest',
    id: 'forrest-1',
  },
  {
    image: forrest4,
    title: 'Birger Forrest',
    id: 'forrest-2',
  },
  {
    image: forrest1,
    title: 'Bjørn Forrest',
    id: 'forrest-3',
  },
  {
    image: forrest3,
    title: 'Halfdan Forrest',
    id: 'forrest-4',
  },
  {
    image: forrest5,
    title: 'Astrid Forrest',
    id: 'forrest-5',
  },
];

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
              color: '#1e293b',
              fontFamily: 'Poppins-Medium',
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
      <Text
        style={{
          fontSize: 24,
          fontFamily: 'Poppins-Medium',
          color: '#1e40af',
          marginBottom: 15,
          marginLeft: 20,
        }}>
        Lakes
      </Text>
      <FlatList
        data={lakes}
        style={{ marginLeft: 10 }}
        renderItem={(item: any) => {
          return (
            <View style={{ marginHorizontal: 10, height: 150 }}>
              <Animated.Image
                sharedTransitionTag={item.item.id}
                sharedTransitionStyle={transition}
                source={item.item.image}
                style={{
                  height: 200,
                  width: 150,
                  marginBottom: 8,
                  borderRadius: 10,
                }}
              />
              <Animated.Text
                sharedTransitionTag={`${item.item.id}-text`}
                sharedTransitionStyle={transition}
                style={{
                  fontFamily: 'Poppins-Regular',
                  fontSize: 16,
                  color: '#1e40af',
                }}>
                {item.item.title}
              </Animated.Text>
            </View>
          );
        }}
        keyExtractor={(item) => item.id}
        horizontal={true}
      />

      <Text
        style={{
          fontSize: 24,
          fontFamily: 'Poppins-Medium',
          color: '#166534',
          marginBottom: 15,
          marginLeft: 20,
        }}>
        Forrests
      </Text>
      <FlatList
        data={forrests}
        style={{ marginLeft: 10 }}
        renderItem={(item: any) => {
          return (
            <View style={{ marginHorizontal: 10 }}>
              <Animated.Image
                sharedTransitionTag={item.item.id}
                sharedTransitionStyle={transition}
                source={item.item.image}
                style={{
                  height: 200,
                  width: 150,
                  marginBottom: 8,
                  borderRadius: 10,
                }}
              />
              <Animated.Text
                sharedTransitionTag={`${item.item.id}-text`}
                sharedTransitionStyle={transition}
                style={{
                  fontFamily: 'Poppins-Regular',
                  fontSize: 16,
                  color: '#064e3b',
                }}>
                {item.item.title}
              </Animated.Text>
            </View>
          );
        }}
        keyExtractor={(item) => item.id}
        horizontal={true}
      />
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
