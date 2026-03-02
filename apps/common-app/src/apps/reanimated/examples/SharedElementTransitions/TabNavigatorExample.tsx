import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useIsFocused } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React, { memo } from 'react';
import { Button, StyleSheet, Text, View } from 'react-native';
import Animated, { SharedTransitionBoundary } from 'react-native-reanimated';
import EmptyExample from '../EmptyExample';

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

function RenderLogger({ id }: { id: number }) {
  console.log('RenderLogger rendered', id);
  return null;
}

function Clicker() {
  console.log('Clicker clicked');
  const [count, setCount] = React.useState(0);
  return <Button title="Click me" onPress={() => setCount(count + 1)} />;
}

type ScreenProps = {
  [key: string]: {
    id?: number;
    showButtons?: boolean;
  };
};

const ScreenContent = memo(
  ({ navigation, route }: NativeStackScreenProps<ScreenProps>) => {
    const id = route.params?.id ?? 0;
    const showButtons = !!route.params?.showButtons;

    return (
      <View style={styles.container}>
        <RenderLogger id={id} />
        <Clicker />
        <Text>Current id: {id}</Text>
        {id === 1 && <EmptyExample />}
        {showButtons && id < 2 && (
          <Button
            title={`Go next ${id + 1}`}
            onPress={() => navigation.push('Details', { id: id + 1 })}
          />
        )}
        {/* {showButtons && id > 0 && (
          <Button
            onPress={() => navigation.push('Details', { id: id - 1 })}
            title={`Go next ${id - 1}`}
          />
        )} */}
        <Animated.View style={getStyle(id)} sharedTransitionTag="tag" />
      </View>
    );
  }
);

function Screen({ navigation, route }: NativeStackScreenProps<ScreenProps>) {
  const id = route.params?.id ?? 0;
  const isActive = useIsFocused();
  return (
    <SharedTransitionBoundary isActive={isActive && id === 0}>
      <ScreenContent navigation={navigation} route={route} />
    </SharedTransitionBoundary>
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
    <Tab.Navigator screenOptions={{ headerShown: false, animation: 'none' }}>
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
    opacity: 0,
  },
  box3: {
    width: 150,
    height: 250,
    backgroundColor: 'red',
    marginLeft: 50,
  },
});

export default TabNavigatorExample;
