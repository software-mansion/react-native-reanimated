/*
STATE: OK

desc: trzeba ustawić z-indeks dla elementu któwy jest animowany
*/

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
} from 'react-native-screens/native-stack';
import Animated from 'react-native-reanimated';
import photo from './assets/image.jpg';
import {
  TouchableNativeFeedback,
} from 'react-native-gesture-handler';

const Stack = createNativeStackNavigator();
const AnimatedButton = Animated.createAnimatedComponent(Button);
const AnimatedImage = Animated.createAnimatedComponent(Image);

/*
This example doesnt works
*/

function Screen1({ navigation }) {
  const goNext = (sharedTransitionTag: string) => {
    navigation.navigate('Screen2', {
      sharedTransitionTag: sharedTransitionTag,
    });
  }
  return (
    <Animated.ScrollView style={{ flex: 1 }}>
      <View style={{display: 'flex', flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-around'}}>
        {
          [...Array(6)].map((_, i) => 
            <TouchableNativeFeedback key={i} onPress={() => { goNext("mleko" + i) }}>
              <AnimatedImage 
                sharedTransitionTag={"mleko" + i}
                source={photo} 
                style={{width: 150, height: 150, margin: 10 }}
              />
            </TouchableNativeFeedback>
          )
        }
      </View>
    </Animated.ScrollView>
  );
}

function Screen2({ route, navigation }) {
  const { sharedTransitionTag } = route.params;

  return (
    <View style={{ flex: 1 }}>
      <Text style={{marginTop: 50, textAlign: 'justify'}}>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Mauris id egestas nunc. Fusce molestie, libero a lacinia mollis, nisi nisi porttitor tortor, eget vestibulum lectus mauris id mi. Aenean imperdiet tempor est eu auctor. Praesent vitae mi at risus dapibus vulputate ac quis ipsum. Nunc tincidunt risus quam, et sagittis neque hendrerit et. Maecenas at fermentum eros, sed accumsan enim. Nam diam est, dapibus malesuada volutpat non, vehicula at mauris.</Text>
      <AnimatedImage
        sharedTransitionTag={sharedTransitionTag}
        source={photo} 
        style={{width: '100%', height: 500}}
      />
      <AnimatedButton
        title="go back"
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
          stackAnimation: 'fade',
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
      </Stack.Navigator>
    </NavigationContainer>
  );
}
