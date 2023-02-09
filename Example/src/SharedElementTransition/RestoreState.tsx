import * as React from 'react';
import { Button, View } from 'react-native';
import { ParamListBase } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Animated from 'react-native-reanimated';
import { StackScreenProps } from '@react-navigation/stack';

const Stack = createNativeStackNavigator();

function Screen1({ navigation }: any) {
  return (
    <Animated.ScrollView style={{ flex: 1 }}>
      <Animated.View
        style={{ width: '100%', height: 100, backgroundColor: 'green' }}
        sharedTransitionTag="mleko"
      />
      <Button
        onPress={() => navigation.navigate('Screen2')}
        title="go to screen2"
      />
    </Animated.ScrollView>
  );
}

function Screen2({ navigation }: StackScreenProps<ParamListBase>) {
  return (
    <View style={{ flex: 1 }}>
      <Animated.View
        style={{
          width: '100%',
          height: 200,
          backgroundColor: 'green',
          marginTop: 200,
        }}
        sharedTransitionTag="mleko"
      />
      <Button
        title="go to screen3"
        onPress={() => navigation.navigate('Screen3')}
      />
      <Button
        title="go back"
        // onPress={() => navigation.navigate('Screen1')}
        onPress={() => navigation.goBack()}
      />
    </View>
  );
}

function Screen3({ navigation }: StackScreenProps<ParamListBase>) {
  return (
    <View style={{ flex: 1, marginTop: 50 }}>
      <Button
        title="go to screen1"
        onPress={() => navigation.navigate('Screen1')}
      />
      <Button
        title="go to screen2"
        onPress={() => navigation.navigate('Screen2')}
      />
    </View>
  );
}

export function RestoreStateExample() {
  return (
    // <NavigationContainer>
    <Stack.Navigator>
      <Stack.Screen
        name="Screen1"
        component={Screen1}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Screen2"
        component={Screen2}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Screen3"
        component={Screen3}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
    // </NavigationContainer>
  );
}
