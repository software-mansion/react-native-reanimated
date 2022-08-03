import React from 'react';
import { NavigationProp } from '@react-navigation/native';
import { createNativeStackNavigator } from 'react-native-screens/native-stack';
import Animated, { SlideInLeft, SlideOutDown } from 'react-native-reanimated';
import { View, Text, Button } from 'react-native';

const Stack = createNativeStackNavigator();

const Screen1 = ({ navigation }: { navigation: NavigationProp<any> }) => {
  return (
    <View>
      <Text> Screen 1 </Text>
      <Button
        title="open modal"
        onPress={() => navigation.navigate('Screen2')}
      />
    </View>
  );
};

const Screen2 = () => {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Animated.View
        style={{ position: 'absolute', height: '100%', width: '100%' }}>
        <View style={{ backgroundColor: 'black', opacity: 0.5, flex: 1 }} />
      </Animated.View>
      <Animated.View
        entering={SlideInLeft.springify()}
        exiting={SlideOutDown.duration(2000)}
        style={{ height: 100, width: 100, backgroundColor: 'red' }}>
        <Animated.Text entering={SlideInLeft.duration(1000)}>
          screen 2
        </Animated.Text>
      </Animated.View>
    </View>
  );
};

const App = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: 'red' },
        gestureEnabled: true,
      }}>
      <Stack.Screen name="Screen1" component={Screen1} />
      <Stack.Screen name="Screen2" component={Screen2} />
    </Stack.Navigator>
  );
};

export default App;
