import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';

import Basic from './Basic';
import StandaloneMap from './Map';
import FullFeatured from './FullFeatured';
import { List } from '../Navigation';

const Stack = createStackNavigator();

function StandaloneHome() {
  return <List items={['Basic', 'Full featured', 'Map as items']} />;
}

export default function App() {
  return (
    <Stack.Navigator
      screenOptions={{
        gestureEnabled: false,
      }}
      // initialRouteName="Full Featured"
      headerMode="screen"
    >
      <Stack.Screen component={StandaloneHome} name="Standalone" />
      <Stack.Screen component={Basic} name="Basic" />
      <Stack.Screen component={StandaloneMap} name="Map as items" />
      <Stack.Screen
        name="Full featured"
        component={FullFeatured}
        options={FullFeatured.options}
      />
    </Stack.Navigator>
  );
}
