import React from 'react';
import { NavigationProp } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { View, Text, Button } from 'react-native';
import {
  ModalNewAPI,
  Modal,
  Carousel,
  MountingUnmounting,
  SpringLayoutAnimation,
} from '../src/LayoutReanimation';

const Stack = createStackNavigator();

const Screen1 = ({ navigation }: { navigation: NavigationProp<any> }) => {
  return (
    <View style={{ flex: 1 }}>
      <Text> Screen 1 </Text>
      <ModalNewAPI />
      <Button title="next" onPress={() => navigation.navigate('Screen2')} />
    </View>
  );
};

const Screen2 = ({ navigation }: { navigation: NavigationProp<any> }) => {
  return (
    <View style={{ flex: 1 }}>
      <Text> Screen 2 </Text>
      <Modal />
      <Button title="next" onPress={() => navigation.navigate('Screen3')} />
    </View>
  );
};
const Screen3 = ({ navigation }: { navigation: NavigationProp<any> }) => {
  return (
    <View style={{ flex: 1 }}>
      <Text> Screen 3 </Text>
      <SpringLayoutAnimation />
      <Button title="next" onPress={() => navigation.navigate('Screen4')} />
    </View>
  );
};
const Screen4 = ({ navigation }: { navigation: NavigationProp<any> }) => {
  return (
    <View style={{ flex: 1 }}>
      <Text> Screen 4 </Text>
      <Carousel />
      <Button title="next" onPress={() => navigation.navigate('Screen5')} />
    </View>
  );
};
const Screen5 = ({ navigation }: { navigation: NavigationProp<any> }) => {
  return (
    <View style={{ flex: 1 }}>
      <Text> Screen 5 </Text>
      <MountingUnmounting />
      <Button title="next" onPress={() => navigation.navigate('Screen1')} />
    </View>
  );
};

const Home = ({ navigation }: any) => {
  return (
    <View>
      <Button
        title="open nested navigation"
        onPress={() => {
          navigation.navigate('navigation');
        }}
      />
    </View>
  );
};

const SimpleContainer = () => {
  return (
    <Stack.Navigator
      detachInactiveScreens={true}
      mode="modal"
      screenOptions={{
        animationEnabled: false,
        headerStyle: { backgroundColor: 'red' },
        gestureEnabled: true,
        // cardOverlayEnabled: true,
      }}>
      <Stack.Screen component={Screen1} name="Screen1" />
      <Stack.Screen component={Screen2} name="Screen2" />
      <Stack.Screen component={Screen3} name="Screen3" />
      <Stack.Screen component={Screen4} name="Screen4" />
      <Stack.Screen component={Screen5} name="Screen5" />
    </Stack.Navigator>
  );
};

const App = () => {
  return (
    <Stack.Navigator
      detachInactiveScreens={true}
      mode="modal"
      screenOptions={{
        animationEnabled: false,
        headerStyle: { backgroundColor: 'red' },
        gestureEnabled: true,
        // cardOverlayEnabled: true,
      }}>
      <Stack.Screen name="home" component={Home} />
      <Stack.Screen name="navigation" component={SimpleContainer} />
    </Stack.Navigator>
  );
};

export default App;
