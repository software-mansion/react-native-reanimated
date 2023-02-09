import { ParamListBase } from '@react-navigation/native';
import { StackScreenProps } from '@react-navigation/stack';
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import {
  View,
  Text,
  Image,
  ImageSourcePropType,
  Pressable,
  ScrollView,
  Button,
} from 'react-native';
import Animated from 'react-native-reanimated';

import florence from './assets/florence.jpg';
import countryside from './assets/countryside.jpg';
import dawn from './assets/dawn.jpg';

const AnimatedImage = Animated.createAnimatedComponent(Image);
const AnimatedText = Animated.createAnimatedComponent(Text);

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
    <View style={{ alignItems: 'center' }}>
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
            style={{ zIndex: -index, alignItems: 'center' }}
            key={`${image}@${index}`}>
            <AnimatedImage
              source={image}
              style={{
                height: size,
                width: size,
                marginTop,
                borderRadius: 15,
              }}
              sharedTransitionTag={`${image}@${index}`}
            />
            <AnimatedText
              onPress={() => onDetails?.(image, index)}
              style={
                collapsed
                  ? { marginTop: -20, zIndex: -index - 1 }
                  : { zIndex: -index - 1 }
              }
              sharedTransitionTag={`${image}@${index}_text`}>
              Show details maybe
            </AnimatedText>
          </View>
        );
      })}
    </View>
  );
}

export function ScreenOne({ navigation }: StackScreenProps<ParamListBase>) {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <AnimatedText
        sharedTransitionTag="t1"
        style={{ fontSize: 16, fontWeight: 'bold' }}>
        Florence
      </AnimatedText>
      <AnimatedText sharedTransitionTag="t2">Or something</AnimatedText>
      <AnimatedText sharedTransitionTag="t3">I dunno</AnimatedText>
      <Pressable onPress={() => navigation.navigate('Screen2')}>
        <ImageStack
          images={[florence, countryside, dawn, florence, countryside, dawn]}
          collapsed
        />
      </Pressable>
    </View>
  );
}

export function ScreenTwo({ navigation }: StackScreenProps<ParamListBase>) {
  return (
    <ScrollView style={{ flex: 1 }}>
      <AnimatedText
        sharedTransitionTag="t1"
        style={{ fontSize: 16, fontWeight: 'bold' }}>
        Florence
      </AnimatedText>
      <AnimatedText sharedTransitionTag="t2">Or something</AnimatedText>
      <AnimatedText sharedTransitionTag="t3">I dunno</AnimatedText>
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
}: StackScreenProps<ParamListBase>) {
  const { image, index } = route.params as any;
  return (
    <View style={{ flex: 1 }}>
      <AnimatedImage
        source={image}
        style={{
          width: '100%',
          height: 400,
          marginTop: 0,
        }}
        sharedTransitionTag={`${image}@${index}`}
      />
      <Button onPress={() => navigation.popToTop()} title="Go home" />
    </View>
  );
}

export function ImageStackExample() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Screen1" component={ScreenOne} />
      <Stack.Screen
        name="Screen2"
        component={ScreenTwo}
        options={{ animation: 'none' }}
      />
      <Stack.Screen name="Screen3" component={ScreenThree} />
    </Stack.Navigator>
  );
}
