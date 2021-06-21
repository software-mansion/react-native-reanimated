import React, {useEffect} from 'react';
import {NavigationContainer, NavigationProp} from '@react-navigation/native';
import {enableScreens} from 'react-native-screens';
import {createNativeStackNavigator} from 'react-native-screens/native-stack';
import {AnimatedLayout} from 'react-native-reanimated';

enableScreens(true);
const Stack = createNativeStackNavigator();

const Screen1 = ({navigation}: {navigation: NavigationProp<any>}) => {
  useEffect(() => navigation.navigate('Screen2'), [navigation]);
  return null;
};

const Screen2 = () => {
  return <AnimatedLayout />;
};

const App = () => {
  return (
      <Stack.Navigator initialRouteName="Screen1">
        <Stack.Screen name="Screen1" component={Screen1} />
        <Stack.Screen name="Screen2" component={Screen2} />
      </Stack.Navigator>
  );
};

export default App;
