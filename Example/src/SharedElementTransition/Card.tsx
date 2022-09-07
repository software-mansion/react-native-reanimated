/*
STATE: FAIL

desc: no nie do końca działa tak jak powinno
*/

import * as React from 'react';
import {
  Button,
  View,
  Image,
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import {
  createNativeStackNavigator,
} from 'react-native-screens/native-stack';
import Animated from 'react-native-reanimated';
import {
  TouchableNativeFeedback,
} from 'react-native-gesture-handler';
import photo from './assets/image.jpg'

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
    <Animated.View 
      style={isOpen ? { height: 500, marginTop: 50 } : { height: 110, marginTop: 20 }}
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
  </TouchableNativeFeedback>
}

function Screen1({ navigation }) {
  return (
    <Animated.ScrollView style={{ flex: 1 }}>
      <Card navigation={navigation} title="Mleko1" transitionTag="mleko1" />
      <Card navigation={navigation} title="Mleko2" transitionTag="mleko2" />
      <Card navigation={navigation} title="Mleko3" transitionTag="mleko3" />
      <Card navigation={navigation} title="Mleko4" transitionTag="mleko4" />
      <Card navigation={navigation} title="Mleko5" transitionTag="mleko5" />
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
      <Button
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
          stackAnimation: 'none',
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
