import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import type { ImageSourcePropType } from 'react-native';
import { Button, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import florence from './assets/florence.jpg';
import countryside from './assets/countryside.jpg';
import dawn from './assets/dawn.jpg';
import { withSharedTransitionBoundary } from './withSharedTransitionBoundary';

type ParamList = {
  Screen1?: object;
  Screen2?: object;
  Screen3: {
    image: ImageSourcePropType;
    index: number;
  };
};

const Stack = createNativeStackNavigator<ParamList>();

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
          <View style={[{ zIndex: -index }, styles.center]} key={index}>
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
              sharedTransitionTag={`SET${index}`}
            />
            <Animated.Text
              onPress={() => onDetails?.(image, index)}
              style={
                collapsed
                  ? { marginTop: -20, zIndex: -index - 1 }
                  : { zIndex: -index - 1 }
              }
              sharedTransitionTag={`SET${index}_text`}>
              Show details maybe
            </Animated.Text>
          </View>
        );
      })}
    </View>
  );
}

export function ScreenOneContent({
  navigation,
}: NativeStackScreenProps<ParamList, 'Screen1'>) {
  return (
    <View style={styles.container}>
      <Animated.Text sharedTransitionTag="t1" style={styles.text}>
        Florence
      </Animated.Text>
      <Animated.Text sharedTransitionTag="t2">Or something</Animated.Text>
      <Animated.Text sharedTransitionTag="t3">I dunno</Animated.Text>
      <Pressable onPress={() => navigation.navigate('Screen2', {})}>
        <ImageStack
          images={[florence, countryside, dawn, florence, countryside, dawn]}
          collapsed
        />
      </Pressable>
    </View>
  );
}

export function ScreenTwoContent({
  navigation,
}: NativeStackScreenProps<ParamList, 'Screen2'>) {
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

export function ScreenThreeContent({
  navigation,
  route,
}: NativeStackScreenProps<ParamList, 'Screen3'>) {
  const { image, index } = route.params;
  return (
    <View style={styles.flexOne}>
      <Animated.Image
        source={image}
        style={styles.image}
        sharedTransitionTag={`SET${index}`}
      />
      <Button onPress={() => navigation.popToTop()} title="Go home" />
    </View>
  );
}

const ScreenOne = withSharedTransitionBoundary(ScreenOneContent);
const ScreenTwo = withSharedTransitionBoundary(ScreenTwoContent);
const ScreenThree = withSharedTransitionBoundary(ScreenThreeContent);

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
