import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';

import ScalableImageExample from './ScalableImageExample';
import InstagramFeed from './InstagramFeed/InstagramFeed';

import { List } from '../Navigation';
import { HeaderPropsScrapper } from '../DetachedHeader';

const Stack = createStackNavigator();

function Home() {
  return <List items={['Scalable image', 'Instagram Feed']} />;
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
        options={{
          header: HeaderPropsScrapper,
        }}
        component={ScalableImageExample}
        name="Scalable image"
      />
      <Stack.Screen
        options={{
          header: HeaderPropsScrapper,
          headerBackTitleVisible: false,
          title: 'Instagram',
        }}
        component={InstagramFeed}
        name="Instagram Feed"
      />
    </Stack.Navigator>
  );
}
