import * as React from 'react';
import { Button, View, StyleSheet } from 'react-native';
import { ParamListBase } from '@react-navigation/native';
import {
  createNativeStackNavigator,
  NativeStackScreenProps,
} from '@react-navigation/native-stack';
import Animated from 'react-native-reanimated';

const Stack = createNativeStackNavigator();

function Screen1({ navigation }: NativeStackScreenProps<ParamListBase>) {
  return (
    <View style={[styles.flexOne, styles.margins]}>
      <Animated.ScrollView style={styles.margins}>
        <Animated.View
          style={styles.redBox}
          sharedTransitionTag="sharedElement"
        />
        <Button
          onPress={() => navigation.navigate('Screen2')}
          title="go to screen2"
        />
      </Animated.ScrollView>
    </View>
  );
}

function Screen2({ navigation }: NativeStackScreenProps<ParamListBase>) {
  return (
    <View style={styles.flexOne}>
      <Animated.View
        style={styles.greenBox}
        sharedTransitionTag="sharedElement"
      />
      <Button
        title="go to screen3"
        onPress={() => navigation.navigate('Screen3')}
      />
      <Button title="go back" onPress={() => navigation.goBack()} />
    </View>
  );
}

function Screen3({ navigation }: NativeStackScreenProps<ParamListBase>) {
  return (
    <View style={styles.container}>
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

export default function RestoreStateExample() {
  return (
    <Stack.Navigator
      screenOptions={{
        animation: 'fade',
      }}>
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
  );
}

const styles = StyleSheet.create({
  flexOne: {
    flex: 1,
  },
  container: {
    flex: 1,
    marginTop: 50,
  },
  margins: {
    marginTop: 50,
    marginLeft: 50,
  },
  redBox: {
    width: 50,
    height: 100,
    backgroundColor: 'red',
    marginTop: 50,
    marginLeft: 50,
  },
  greenBox: {
    width: '100%',
    height: 200,
    backgroundColor: 'green',
    marginTop: 200,
  },
});
