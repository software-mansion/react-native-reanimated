import { useIsFocused, type ParamListBase } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as React from 'react';
import { Button, StyleSheet, View } from 'react-native';
import Animated, { SharedTransitionBoundary } from 'react-native-reanimated';

const Stack = createNativeStackNavigator();

function Screen1({ navigation }: NativeStackScreenProps<ParamListBase>) {
  const isFocused = useIsFocused();
  return (
    <SharedTransitionBoundary isActive={isFocused}>
      <View style={styles.flexOne}>
        <Animated.View style={styles.redBox} sharedTransitionTag="tag1" />
        <Button
          title="Screen2"
          onPress={() => navigation.navigate('Screen2')}
        />
        <Button
          title="Screen3"
          onPress={() => navigation.navigate('Screen3')}
        />
      </View>
    </SharedTransitionBoundary>
  );
}

function Screen2({ navigation }: NativeStackScreenProps<ParamListBase>) {
  const isFocused = useIsFocused();
  return (
    <SharedTransitionBoundary isActive={isFocused}>
      <View style={styles.container}>
        <Animated.View style={styles.greenBox} sharedTransitionTag="tag1" />
        <Button title="Screen1" onPress={() => navigation.popTo('Screen1')} />
        <Button
          title="Screen3"
          onPress={() => navigation.navigate('Screen3')}
        />
      </View>
    </SharedTransitionBoundary>
  );
}

function Screen3({ navigation }: NativeStackScreenProps<ParamListBase>) {
  const isFocused = useIsFocused();
  return (
    <SharedTransitionBoundary isActive={isFocused}>
      <View style={styles.flexOne}>
        <Animated.View style={styles.blueBox} sharedTransitionTag="tag1" />
        <Button title="Screen1" onPress={() => navigation.popTo('Screen1')} />
        <Button title="Screen2" onPress={() => navigation.popTo('Screen2')} />
      </View>
    </SharedTransitionBoundary>
  );
}

export default function ManyScreensExample() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="Screen1"
        component={Screen1}
        options={{ headerShown: true }}
      />
      <Stack.Screen
        name="Screen2"
        component={Screen2}
        options={{ headerShown: true }}
      />
      <Stack.Screen
        name="Screen3"
        component={Screen3}
        options={{ headerShown: true }}
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
  redBox: {
    width: 150,
    height: 150,
    backgroundColor: 'red',
  },
  greenBox: {
    width: 100,
    height: 100,
    backgroundColor: 'green',
  },
  blueBox: {
    width: 100,
    height: 100,
    backgroundColor: 'blue',
  },
});
