import React, {useEffect} from 'react';
import {NavigationContainer, NavigationProp} from '@react-navigation/native';
import {enableScreens} from 'react-native-screens';
import {CardStyleInterpolators, createStackNavigator} from '@react-navigation/stack';
import Animated, {AnimatedLayout, SlideInLeft, SlideInDown, SlideOutDown, FadeIn, FadeOut} from 'react-native-reanimated';
import { View, Text, Button } from 'react-native';

enableScreens(true);
const Stack = createStackNavigator();

const Screen1 = ({navigation}: {navigation: NavigationProp<any>}) => {
  return (
    <View>
      <Text> Screen 1 </Text>
      <Button title="open modal" onPress={() => navigation.navigate('Screen2')}/> 
    </View>
  );
};

const Screen2 = () => {
  return (
    <AnimatedLayout style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
      <Animated.View style={{position: 'absolute', height: "100%", width: '100%'}} entering={FadeIn.springify()} exiting={FadeOut.duration(2000)}>
        <View style={{backgroundColor: 'black', opacity: 0.5, flex: 1}}/>
      </Animated.View>
      <Animated.View entering={SlideInLeft.springify()} exiting={SlideOutDown.duration(2000)} style={{height: 100, width:100, backgroundColor: 'red'}}>
          <Animated.Text entering={SlideInLeft.duration(1000)}> 
            screen 2 
          </Animated.Text>
      </Animated.View>
    </AnimatedLayout>
  );
};

const App = () => {
  return (
      <Stack.Navigator
        detachInactiveScreens={false}
        mode="modal"
        screenOptions={{
          animationEnabled: false,
          cardStyle: { backgroundColor: 'transparent' },
          headerStyle: {backgroundColor: 'red'},
          gestureEnabled: true,
          // cardOverlayEnabled: true,
      }}>
        <Stack.Screen name="Screen1" component={Screen1} />
        <Stack.Screen name="Screen2" component={Screen2} />
      </Stack.Navigator>
  );
};

export default App;