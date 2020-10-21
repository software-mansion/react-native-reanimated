import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';

import ImageTransformerTest from './ImageTransformerTest';

import { List } from '../Navigation';

const Stack = createStackNavigator();

function Home() {
  return <List items={['Image Transformer']} />;
}

export default function App() {
  return (
    <Stack.Navigator
      screenOptions={{
        gestureEnabled: false,
      }}
      initialRouteName="Transformer"
      headerMode="screen"
    >
      <Stack.Screen component={Home} name="Transformer" />
      <Stack.Screen
        component={ImageTransformerTest}
        name="Image Transformer"
      />
    </Stack.Navigator>
  );
}
