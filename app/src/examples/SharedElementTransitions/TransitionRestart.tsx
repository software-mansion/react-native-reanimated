import * as React from 'react';
import { View, Button, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { ParamListBase } from '@react-navigation/native';
import {
  createNativeStackNavigator,
  NativeStackScreenProps,
} from '@react-navigation/native-stack';
import Animated, {
  SharedTransition,
  SharedTransitionType,
} from 'react-native-reanimated';

const Stack = createNativeStackNavigator();
const transition = SharedTransition.defaultTransitionType(
  SharedTransitionType.ANIMATION
).duration(500);

function navigationSequence(
  navigation: any,
  firstScreen: string,
  nextScreen: string
) {
  navigation.navigate(firstScreen);
  setTimeout(() => {
    navigation.navigate(nextScreen);
  }, 150);
}

function SharedView({ style }: { style: StyleProp<ViewStyle> }) {
  return <Animated.View style={style} sharedTransitionTag="tag1" />;
}

function SharedViewWithAnimation({ style }: { style: StyleProp<ViewStyle> }) {
  return (
    <Animated.View
      style={style}
      sharedTransitionTag="tag2"
      sharedTransitionStyle={transition}
    />
  );
}

function Screen1({ navigation }: NativeStackScreenProps<ParamListBase>) {
  return (
    <View style={styles.flexOne}>
      <SharedView style={styles.redBox} />
      <SharedViewWithAnimation style={styles.redBox} />
      <Button
        title="2 -> 1"
        onPress={() => navigationSequence(navigation, 'Screen2', 'Screen1')}
      />
      <Button
        title="2 -> 3"
        onPress={() => navigationSequence(navigation, 'Screen2', 'Screen3')}
      />
      <Button title="Screen2" onPress={() => navigation.navigate('Screen2')} />
      <Button title="Screen3" onPress={() => navigation.navigate('Screen3')} />
    </View>
  );
}

function Screen2({ navigation }: NativeStackScreenProps<ParamListBase>) {
  return (
    <View style={styles.container}>
      <SharedView style={styles.greenBox} />
      <SharedViewWithAnimation style={styles.greenBox} />
      <Button
        title="1 -> 2"
        onPress={() => navigationSequence(navigation, 'Screen1', 'Screen2')}
      />
      <Button title="Screen1" onPress={() => navigation.navigate('Screen1')} />
      <Button title="Screen3" onPress={() => navigation.navigate('Screen3')} />
    </View>
  );
}

function Screen3({ navigation }: NativeStackScreenProps<ParamListBase>) {
  return (
    <View style={styles.flexOne}>
      <SharedView style={styles.blueBox} />
      <SharedViewWithAnimation style={styles.blueBox} />
      <Button title="Screen1" onPress={() => navigation.navigate('Screen1')} />
      <Button title="Screen2" onPress={() => navigation.navigate('Screen2')} />
    </View>
  );
}

export default function TransitionRestartExample() {
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
