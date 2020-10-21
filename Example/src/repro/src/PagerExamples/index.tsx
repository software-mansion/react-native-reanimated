import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';

import PagerExample from './PagerExample';

import { List } from '../Navigation';

const Stack = createStackNavigator();

function Home() {
  return <List items={['Pager']} />;
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
        component={PagerExample}
        name="Pager"
      />
    </Stack.Navigator>
  );
}
