import * as React from 'react';
import {
  Button,
  View,
  Image,
  Text
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import {
  createNativeStackNavigator,
  NativeStackNavigationProp,
} from 'react-native-screens/native-stack';
import Animated, {
  withTiming,
  SharedTransition,
  withSpring,
  FadeIn,
  FadeInDown,
  Layout,
} from 'react-native-reanimated';
import photo from './image.jpg'

const Stack = createNativeStackNavigator();
const AnimatedButton = Animated.createAnimatedComponent(Button);
const AnimatedImage = Animated.createAnimatedComponent(Image);

// const transition = SharedTransition.custom((values: any) => {
//   'worklet';
//   return {
//     height: withTiming(values.targetHeight),
//     originY: withTiming(values.targetOriginY),
//   }
// });

// const transition = SharedTransition.custom((values: any) => {
//   'worklet';
//   return {
//     height: withSpring(values.targetHeight),
//     originY: withSpring(values.targetOriginY),
//   }
// });

function Screen1({ navigation }) {
  return (
    <Animated.ScrollView style={{ flex: 1 }}>
      {/* <Animated.View
        style={{ width: '100%', height: 100, backgroundColor: 'green' }}
        sharedTransitionTag="mleko"
        // sharedTransitionStyle={transition}
      /> */}
      <View style={{display: 'flex', flexDirection: 'row', flexWrap: 'wrap'}}>
        <AnimatedImage 
          sharedTransitionTag="mleko"
          source={photo} 
          style={{width: 150, height: 150, marginLeft: 50, marginTop: 50 }}
        />
        {/* <AnimatedImage 
          sharedTransitionTag="mleko"
          source={photo} 
          style={{width: 150, height: 150, margin: 20}}
        />
        <AnimatedImage 
          sharedTransitionTag="mleko"
          source={photo} 
          style={{width: 150, height: 150, margin: 20}}
        />
        <AnimatedImage 
          sharedTransitionTag="mleko"
          source={photo} 
          style={{width: 150, height: 150, margin: 20}}
        />
        <AnimatedImage 
          sharedTransitionTag="mleko"
          source={photo} 
          style={{width: 150, height: 150, margin: 20}}
        /> */}
      </View>
      {/* <AnimatedImage 
        sharedTransitionTag="mleko"
        source={photo} 
        style={{width: '100%', height: 300}}
      /> */}
      <Button onPress={() => navigation.navigate('Screen2')} title="Go to the next screen" />
    </Animated.ScrollView>
  );
}

function Screen2({ navigation }) {

  return (
    <View style={{ flex: 1 }}>
      {/* <Animated.View
        style={{ width: '100%', height: 200, backgroundColor: 'green', marginTop: 100 }}
        sharedTransitionTag="mleko"
        // sharedTransitionStyle={transition}
      /> */}
      {/* <Animated.View sharedTransitionTag="mleko">
        <Image 
          source={photo} 
          style={{width: '100%', height: 500}}
        /> 
      </Animated.View> */}
      <Text style={{marginTop: 50, textAlign: 'justify'}}>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Mauris id egestas nunc. Fusce molestie, libero a lacinia mollis, nisi nisi porttitor tortor, eget vestibulum lectus mauris id mi. Aenean imperdiet tempor est eu auctor. Praesent vitae mi at risus dapibus vulputate ac quis ipsum. Nunc tincidunt risus quam, et sagittis neque hendrerit et. Maecenas at fermentum eros, sed accumsan enim. Nam diam est, dapibus malesuada volutpat non, vehicula at mauris.</Text>
      <AnimatedImage
        sharedTransitionTag="mleko"
        source={photo} 
        style={{width: '100%', height: 500}}
      />
      {/* <Animated.Text entering={FadeInDown.delay(1000).duration(500)} style={{margin: 10, textAlign: 'justify'}}>
      Lorem ipsum dolor sit amet, consectetur adipiscing elit. Mauris id egestas nunc. Fusce molestie, libero a lacinia mollis, nisi nisi porttitor tortor, eget vestibulum lectus mauris id mi. Aenean imperdiet tempor est eu auctor. Praesent vitae mi at risus dapibus vulputate ac quis ipsum. Nunc tincidunt risus quam, et sagittis neque hendrerit et. Maecenas at fermentum eros, sed accumsan enim. Nam diam est, dapibus malesuada volutpat non, vehicula at mauris. Curabitur vehicula commodo ligula. Maecenas tincidunt nibh et nulla fermentum efficitur. Donec id fermentum leo, in luctus dui. Nam nec nisi quam. In eu lobortis turpis. Quisque lacinia mi non hendrerit dictum.
      </Animated.Text> */}
      <AnimatedButton
        // entering={FadeInDown.delay(1000).duration(500)}
        title="go to screen3"
        onPress={() => navigation.navigate('Screen3')}
      />
      <AnimatedButton
        // entering={FadeInDown.delay(1000).duration(500)}
        title="go back"
        onPress={() => navigation.navigate('Screen1')}
      />
    </View>
  );
}

function Screen3({ navigation }) {

  return (
    <View style={{ flex: 1 }}>
      <Animated.View
        style={{ width: '50%', height: 100, backgroundColor: 'red', opacity: 0.5 }}
        sharedTransitionTag="mleko123"
        // sharedTransitionStyle={transition}
      />
      <Button
        title="go to screen4"
        onPress={() => navigation.navigate('Screen4')}
      />
      <Button
        title="go back"
        onPress={() => navigation.navigate('Screen2')}
      />
    </View>
  );
}

function Screen4({ navigation }) {

  return (
    <View style={{ flex: 1 }}>
      <Animated.View
        style={{ width: '50%', height: 200, backgroundColor: 'red', opacity: 0.5 }}
        sharedTransitionTag="mleko123"
        // sharedTransitionStyle={transition}
      />
      <Button
        title="go back to screen1"
        onPress={() => navigation.navigate('Screen1')}
      />
    </View>
  );
}

export default function SimpleSharedElementTransition() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          // stackAnimation: 'none',
          stackAnimation: 'fade_from_bottom',
        }}>
        <Stack.Screen
          name="Screen1"
          component={Screen1}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Screen2"
          component={Screen2}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Screen3"
          component={Screen3}
          options={{ headerShown: true }}
        />
        <Stack.Screen
          name="Screen4"
          component={Screen4}
          options={{ headerShown: true }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
