import React from 'react';
import { View, Text, Button } from 'react-native';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { NavigationContainer } from '@react-navigation/native';

const Drawer = createDrawerNavigator();

function Screen({ route }) {
  const text = route.name;
  return (
    <View>
      <Text style={{ padding: 20 }}>{text}</Text>
      <Button
        title={`button from screen ${text}`}
        onPress={() => {
          alert(text);
        }}
      />
    </View>
  );
}

export default function MyDrawer() {
  return (
    <NavigationContainer>
      <Drawer.Navigator>
        <Drawer.Screen name="Feed" component={Screen} />
        <Drawer.Screen name="Article" component={Screen} />
      </Drawer.Navigator>
    </NavigationContainer>
  );
}
