import { RectButton } from 'react-native-gesture-handler';
import React from 'react';
import {
  NavigationContainer,
  useNavigation,
  useFocusEffect,
} from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { Text, StatusBar } from 'react-native';
import { useGalleryInit } from 'react-native-gallery-toolkit';

import Standalone from './StandaloneGalleryExamples/Standalone';
import ImageTransformer from './ImageTransformerExamples';
import ScalableImage from './ScalableImageExamples';
import PagerExamples from './PagerExamples';

const Stack = createStackNavigator();

export function List({ items }: { items: string[] }) {
  useFocusEffect(() => {
    StatusBar.setHidden(false);
  });

  const nav = useNavigation();

  return (
    <>
      {items.map((title) => (
        <RectButton
          onPress={() => nav.navigate(title)}
          style={{
            height: 64,
            alignItems: 'center',
            flexDirection: 'row',
            justifyContent: 'space-between',
            padding: 16,
            backgroundColor: 'white',
            borderBottomColor: '#ccc',
            borderBottomWidth: 1,
          }}
        >
          <Text style={{ fontSize: 18 }}>{title}</Text>
          <Text style={{ fontSize: 24, color: '#4D4D4D' }}>➡</Text>
        </RectButton>
      ))}
    </>
  );
}

function Home() {
  return (
    <List
      items={[
        'Standalone Gallery',
        'Image Transformer',
        'Pager',
        'Scalable Image',
      ]}
    />
  );
}

export default function App() {
  useGalleryInit();
  return (
    <>
      <StatusBar translucent showHideTransition="fade" />
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="Examples"
          screenOptions={{
            gestureEnabled: false,
            headerShown: false,
            headerBackTitleVisible: false,
          }}
          headerMode="screen"
        >
          <Stack.Screen
            options={{
              headerShown: true,
            }}
            component={Home}
            name="Examples"
          />
          <Stack.Screen
            component={Standalone}
            name="Standalone Gallery"
          />
          <Stack.Screen
            component={ImageTransformer}
            name="Image Transformer"
          />
          <Stack.Screen component={PagerExamples} name="Pager" />

          <Stack.Screen
            component={ScalableImage}
            name="Scalable Image"
          />
        </Stack.Navigator>
      </NavigationContainer>
    </>
  );
}
