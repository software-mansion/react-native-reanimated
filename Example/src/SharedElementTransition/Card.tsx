/*
STATE: OK
*/

import * as React from 'react';
import {
  Button,
  View,
  Image,
  LogBox,
  TouchableNativeFeedback
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import {
  createNativeStackNavigator,
} from 'react-native-screens/native-stack';
import Animated from 'react-native-reanimated';
import {
  // TouchableNativeFeedback,
} from 'react-native-gesture-handler';
import photo from './assets/image.jpg'
LogBox.ignoreLogs(['Looks']); // soooooo anoying 😡

const Stack = createNativeStackNavigator();
const AnimatedImage = Animated.createAnimatedComponent(Image);

function Card({ navigation, title, transitionTag, isOpen = false }) {
  const goNext = (screenName: string) => {
    navigation.navigate(screenName, {
      title: title,
      sharedTransitionTag: transitionTag,
    });
  }
  
  return <TouchableNativeFeedback onPress={() => { goNext(isOpen ? 'Screen1' : 'Screen2') }}>
    {/* <Animated.View 
      sharedTransitionTag={transitionTag + "1_"}
      style={{backgroundColor: 'red'}}
    > */}
    <Animated.View 
      style={isOpen ? { height: 500, marginTop: 50, backgroundColor: 'green' } : { height: 120, marginTop: 20, backgroundColor: 'green' }}
      sharedTransitionTag={transitionTag + "1"}
    >
      <Animated.Text
        sharedTransitionTag={transitionTag + "2"}
        style={{ width: '100%', height: 20 }}
      >
        {title}
      </Animated.Text>
      <AnimatedImage 
        sharedTransitionTag={transitionTag + "3"}
        source={photo} 
        style={{ width: '100%', height: isOpen ? 300 : 100 }}
      />
      <Animated.Text
        sharedTransitionTag={transitionTag + "4"}
        style={{ width: '100%', height: isOpen ? 100 : 0 }}
      >
        Lorem ipsum dolor sit amet consectetur adipisicing elit. Quas aliquid, earum non, dignissimos fugit rerum exercitationem ab consequatur, error animi veritatis delectus. Nostrum sapiente distinctio possimus vel nam facilis ut?
      </Animated.Text>
    </Animated.View>
    {/* </Animated.View> */}
  </TouchableNativeFeedback>
}

function Screen1({ navigation }) {
  return (
    <Animated.ScrollView style={{ flex: 1, /* marginTop: 200 */ }}>
      {
        [...Array(6)].map((_, i) => 
          <Card 
            key={i} 
            navigation={navigation} 
            title={"Mleko" + i} 
            transitionTag={"mleko1" + i} 
          />
        )
      }
    </Animated.ScrollView>
  );
}

function Screen2({ route, navigation }) {
  const { title, sharedTransitionTag } = route.params;

  return (
    <View style={{ flex: 1 }}>
      <Card 
        navigation={navigation} 
        title={title} 
        transitionTag={sharedTransitionTag} 
        isOpen={true} 
      />
    </View>
  );
}

export default function SimpleSharedElementTransition() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          // stackAnimation: 'fade_from_bottom',
          // stackAnimation: 'slide_from_right',
          stackAnimation: 'fade',
          // stackAnimation: 'none',
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
