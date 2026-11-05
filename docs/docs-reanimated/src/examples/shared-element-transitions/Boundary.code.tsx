import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer, useIsFocused } from '@react-navigation/native';
import Animated, { SharedTransitionBoundary } from 'react-native-reanimated';

const Tab = createBottomTabNavigator();

function HomeScreen() {
  const isFocused = useIsFocused();

  return (
    <SharedTransitionBoundary isActive={isFocused}>
      <Text>Hi, Ada</Text>
      <Animated.View sharedTransitionTag="avatar" style={styles.smallAvatar} />
    </SharedTransitionBoundary>
  );
}

function ProfileScreen() {
  const isFocused = useIsFocused();

  return (
    <SharedTransitionBoundary isActive={isFocused}>
      <Animated.View sharedTransitionTag="avatar" style={styles.largeAvatar} />
      <Text>Ada Lovelace</Text>
    </SharedTransitionBoundary>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      {/* Keep the views of inactive tabs, so that a transition can start from them. */}
      <Tab.Navigator detachInactiveScreens={false}>
        <Tab.Screen name="Home" component={HomeScreen} />
        <Tab.Screen name="Profile" component={ProfileScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  smallAvatar: {
    alignSelf: 'flex-end',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#b58df1',
  },
  largeAvatar: {
    alignSelf: 'center',
    width: 140,
    height: 140,
    borderRadius: 40,
    backgroundColor: '#ffe780',
  },
});
