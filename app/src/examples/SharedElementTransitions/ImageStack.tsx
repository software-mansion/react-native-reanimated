import { ParamListBase } from '@react-navigation/native';
import React from 'react';
import {
  createNativeStackNavigator,
  NativeStackScreenProps,
} from '@react-navigation/native-stack';
import {
  View,
  ImageSourcePropType,
  Pressable,
  ScrollView,
  Button,
  StyleSheet,
} from 'react-native';
import Animated from 'react-native-reanimated';

const florence = require('./assets/florence.jpg');
const countryside = require('./assets/countryside.jpg');
const dawn = require('./assets/dawn.jpg');

const Stack = createNativeStackNavigator();

export function ImageStack({
  images,
  collapsed = false,
  onDetails,
}: {
  images: ImageSourcePropType[];
  collapsed?: boolean;
  onDetails?: (image: ImageSourcePropType, index: number) => void;
}) {
  if (collapsed) {
    images = images.slice(0, 3);
  }

  return (
    <View style={styles.center}>
      {images.map((image, index) => {
        let size: number;
        if (!collapsed) {
          size = 320;
        } else {
          size = 320 - (collapsed ? 40 * index : 0);
        }
        const marginTop = index === 0 || !collapsed ? 20 : -size + 20;
        return (
          <View
            style={[{ zIndex: -index }, styles.center]}
            key={`${image}@${index}`}>
            <Animated.Image
              source={image}
              style={[
                {
                  height: size,
                  width: size,
                  marginTop,
                },
                styles.roundedBorder,
              ]}
              sharedTransitionTag={`${image}@${index}`}
            />
            <Animated.Text
              onPress={() => onDetails?.(image, index)}
              style={
                collapsed
                  ? { marginTop: -20, zIndex: -index - 1 }
                  : { zIndex: -index - 1 }
              }
              sharedTransitionTag={`${image}@${index}_text`}>
              Show details maybe
            </Animated.Text>
          </View>
        );
      })}
    </View>
  );
}

export function ScreenOne({
  navigation,
}: NativeStackScreenProps<ParamListBase>) {
  return (
    <View style={styles.container}>
      <Animated.Text sharedTransitionTag="t1" style={styles.text}>
        Florence
      </Animated.Text>
      <Animated.Text sharedTransitionTag="t2">Or something</Animated.Text>
      <Animated.Text sharedTransitionTag="t3">I dunno</Animated.Text>
      <Pressable onPress={() => navigation.navigate('Screen2')}>
        <ImageStack
          images={[florence, countryside, dawn, florence, countryside, dawn]}
          collapsed
        />
      </Pressable>
    </View>
  );
}

export function ScreenTwo({
  navigation,
}: NativeStackScreenProps<ParamListBase>) {
  return (
    <ScrollView style={styles.flexOne}>
      <Animated.Text sharedTransitionTag="t1" style={styles.text}>
        Florence
      </Animated.Text>
      <Animated.Text sharedTransitionTag="t2">Or something</Animated.Text>
      <Animated.Text sharedTransitionTag="t3">I dunno</Animated.Text>
      <ImageStack
        images={[florence, countryside, dawn, florence, countryside, dawn]}
        onDetails={(image, index) => {
          navigation.navigate('Screen3', { image, index });
        }}
      />
    </ScrollView>
  );
}

export function ScreenThree({
  navigation,
  route,
}: NativeStackScreenProps<ParamListBase>) {
  const { image, index } = route.params as any;
  return (
    <View style={styles.flexOne}>
      <Animated.Image
        source={image}
        style={styles.image}
        sharedTransitionTag={`${image}@${index}`}
      />
      <Button onPress={() => navigation.popToTop()} title="Go home" />
    </View>
  );
}

export default function ImageStackExample() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Screen1" component={ScreenOne} />
      <Stack.Screen name="Screen2" component={ScreenTwo} />
      <Stack.Screen name="Screen3" component={ScreenThree} />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  flexOne: { flex: 1 },
  center: {
    alignItems: 'center',
  },
  roundedBorder: {
    borderRadius: 15,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  image: {
    width: '100%',
    height: 400,
    marginTop: 0,
  },
});
