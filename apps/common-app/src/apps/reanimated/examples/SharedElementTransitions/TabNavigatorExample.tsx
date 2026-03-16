import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { Button, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

function getStyle(index: number) {
  switch (index) {
    case 0:
      return styles.box1;
    case 1:
      return styles.box2;
    default:
      return styles.box3;
  }
}

type ScreenProps = {
  [key: string]: {
    id?: number;
    showButtons?: boolean;
  };
};
function Screen({ navigation, route }: NativeStackScreenProps<ScreenProps>) {
  const id = route.params?.id ?? 0;
  const showButtons = !!route.params?.showButtons;
  return (
    <View style={styles.container}>
      <Text>Current id: {id}</Text>
      {showButtons && id < 2 && (
        <Button
          title={`Go next ${id + 1}`}
          onPress={() => navigation.push('Details', { id: id + 1 })}
        />
      )}
      {showButtons && id > 0 && (
        <Button
          onPress={() => navigation.push('Details', { id: id - 1 })}
          title={`Go next ${id - 1}`}
        />
      )}
      <Animated.View style={getStyle(id)} sharedTransitionTag="test" />
    </View>
  );
}

function createStack() {
  const Stack = createNativeStackNavigator();
  return () => (
    <Stack.Navigator>
      <Stack.Screen
        name="Details"
        initialParams={{ showButtons: true }}
        component={Screen as React.ComponentType}
      />
    </Stack.Navigator>
  );
}

const Tab = createBottomTabNavigator();
const StackA = createStack();
const StackB = createStack();

function TabNavigatorExample() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }}>
      <Tab.Screen
        name="A"
        initialParams={{ id: 0 }}
        component={Screen as React.ComponentType}
      />
      <Tab.Screen
        name="B"
        initialParams={{ id: 1 }}
        component={Screen as React.ComponentType}
      />
      <Tab.Screen name="C" component={StackA} />
      <Tab.Screen name="D" component={StackB} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 10,
  },
  box1: {
    width: 100,
    height: 100,
    backgroundColor: 'green',
  },
  box2: {
    width: 200,
    height: 100,
    backgroundColor: 'blue',
  },
  box3: {
    width: 150,
    height: 250,
    backgroundColor: 'red',
    marginLeft: 50,
  },
});

export default TabNavigatorExample;
