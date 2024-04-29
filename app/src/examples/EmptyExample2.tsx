import React from 'react';
import { StyleSheet, View, Button, LogBox } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import {
  createNativeStackNavigator,
} from 'react-native-screens/native-stack';
import Animated from 'react-native-reanimated';

LogBox.ignoreLogs(['']);

const colors = [
  'snow',
  'cornsilk',
  'papayawhip',
  'bisque',
  'peachpuff',
  'orange',
  'coral',
  'orangered',
  'red',
];

const DetailsScreen = ({
  navigation,
  route,
}): JSX.Element => {
  const index = route.params?.index ? route.params?.index : 0;
  const currentColor =
    index < colors.length ? colors[index] : colors[colors.length - 1];

  return (
    <View style={{ ...styles.container, backgroundColor: currentColor }}>
      <Button
        title={`Go next ${index + 1}`}
        onPress={() => navigation.push('Details', { index: index + 1 })}
      />
      <Button
        onPress={() => navigation.pop()}
        title={`Go next ${index - 1}`}
      />
      <Animated.View style={index === 0 ? styles.box1 : styles.box2} sharedTransitionTag="test" />
    </View>
  );
};

const DetailsScreen2 = ({
  navigation,
  route,
}): JSX.Element => {
  const index = route.params?.index ? route.params?.index : 0;
  const currentColor =
    index < colors.length ? colors[index] : colors[colors.length - 1];

  return (
    <View style={{ ...styles.container, backgroundColor: currentColor }}>
      <Button
        title={`Go next ${index + 1}`}
        onPress={() => navigation.push('Details', { index: index + 1 })}
      />
      <Button
        onPress={() => navigation.pop()}
        title={`Go next ${index - 1}`}
      />
      <Animated.View style={index === 0 ? styles.box3 : styles.box4} sharedTransitionTag="test" />
    </View>
  );
};

const createStack = () => {
  const Stack = createNativeStackNavigator();

  const makeStack = () => (
    <Stack.Navigator>
      <Stack.Screen name="Details" component={DetailsScreen} />
    </Stack.Navigator>
  );

  return makeStack;
};
const createStack2 = () => {
  const Stack = createNativeStackNavigator();

  const makeStack = () => (
    <Stack.Navigator>
      <Stack.Screen name="Details" component={DetailsScreen2} />
    </Stack.Navigator>
  );

  return makeStack;
};

const AStack = createStack();
const BStack = createStack2();
const CStack = createStack();
const DStack = createStack();

const Tab = createBottomTabNavigator();

const NavigationTabsAndStack = (): JSX.Element => (
  <Tab.Navigator>
    <Tab.Screen
      name="A"
      component={AStack}
    />
    <Tab.Screen
      name="B"
      component={BStack}
    />
    <Tab.Screen name="C" component={CStack} />
    <Tab.Screen name="D" component={DStack} />
  </Tab.Navigator>
);

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
  },
  box4: {
    width: 200,
    height: 300,
    backgroundColor: 'black',
  },
});

export default NavigationTabsAndStack;
