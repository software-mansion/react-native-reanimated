import * as React from 'react';
import { Button, View, Text, StyleSheet } from 'react-native';
import { ParamListBase } from '@react-navigation/native';
import {
  createNativeStackNavigator,
  NativeStackScreenProps,
} from '@react-navigation/native-stack';
import Animated from 'react-native-reanimated';

const photo = require('./assets/image.jpg');
const Stack = createNativeStackNavigator();
const AnimatedButton = Animated.createAnimatedComponent(Button);

function Screen1({ navigation }: NativeStackScreenProps<ParamListBase>) {
  return (
    <Animated.ScrollView style={styles.flexOne}>
      <View style={styles.container}>
        <View>
          <Animated.View
            sharedTransitionTag="placeholder1"
            style={styles.greenBoxScreenOne}
          />
          <Animated.Image
            sharedTransitionTag="mleko"
            source={photo}
            style={styles.imageScreenOne}
          />
          <Animated.View
            sharedTransitionTag="placeholder2"
            style={styles.redBoxScreenOne}
          />
        </View>
      </View>
      <Button
        onPress={() => navigation.navigate('Screen2')}
        title="Go to the next screen"
      />
    </Animated.ScrollView>
  );
}

function Screen2({ navigation }: NativeStackScreenProps<ParamListBase>) {
  return (
    <View style={styles.flexOne}>
      <Text style={styles.text}>
        Lorem ipsum dolor sit amet, consectetur adipiscing elit. Mauris id
        egestas nunc. Fusce molestie, libero a lacinia mollis, nisi nisi
        porttitor tortor, eget vestibulum lectus mauris id mi. Aenean imperdiet
        tempor est eu auctor.
      </Text>
      <Animated.View
        sharedTransitionTag="placeholder2"
        style={styles.redBoxScreenTwo}
      />
      <Text style={styles.justifyText}>
        Lorem ipsum dolor sit amet, consectetur adipiscing elit. Mauris id
        egestas nunc.
      </Text>
      <Animated.Image
        sharedTransitionTag="mleko"
        source={photo}
        style={styles.imageScreenTwo}
      />
      <Text>Lorem ipsum dolor sit amet</Text>
      <Animated.View
        sharedTransitionTag="placeholder1"
        style={styles.greenBoxScreenTwo}
      />
      <AnimatedButton
        title="go back"
        onPress={() => navigation.navigate('Screen1')}
      />
    </View>
  );
}

export default function ManyTagsExample() {
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
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  flexOne: { flex: 1 },
  text: {
    marginTop: 10,
    textAlign: 'justify',
  },
  justifyText: {
    textAlign: 'justify',
  },
  greenBoxScreenOne: {
    width: 30,
    height: 30,
    margin: 5,
    marginTop: 50,
    backgroundColor: 'green',
  },
  greenBoxScreenTwo: {
    width: 100,
    height: 50,
    margin: 0,
    backgroundColor: 'green',
  },
  redBoxScreenOne: {
    width: 20,
    height: 30,
    margin: 10,
    backgroundColor: 'red',
  },
  redBoxScreenTwo: {
    width: 200,
    height: 50,
    margin: 20,
    backgroundColor: 'red',
  },
  imageScreenOne: {
    width: 150,
    height: 150,
    marginLeft: 50,
  },
  imageScreenTwo: {
    width: '100%',
    height: 300,
  },
  container: {
    display: 'flex',
    flexDirection: 'column',
  },
});
