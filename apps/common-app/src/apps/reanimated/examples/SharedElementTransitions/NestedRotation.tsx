import type { ParamListBase } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as React from 'react';
import { createContext } from 'react';
import { Button, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { withSharedTransitionBoundary } from './withSharedTransitionBoundary';

const Stack = createNativeStackNavigator();

const Context = createContext<{
  blue?: string;
  purple?: string;
  green?: string;
}>({
  blue: undefined,
  purple: undefined,
  green: 'greenTag',
});

function Screen1Content({ navigation }: NativeStackScreenProps<ParamListBase>) {
  const { blue, purple, green } = React.useContext(Context);
  return (
    <Animated.ScrollView style={styles.flexOne}>
      <Animated.View sharedTransitionTag={blue} style={styles.blueBoxScreenOne}>
        <Animated.View
          sharedTransitionTag={purple}
          style={styles.purpleBoxScreenOne}>
          <Animated.View
            style={styles.greenBoxScreenOne}
            sharedTransitionTag={green}
          />
        </Animated.View>
      </Animated.View>
      <Button
        onPress={() => navigation.navigate('Screen2')}
        title="go to screen2"
      />
    </Animated.ScrollView>
  );
}

function Screen2Content({ navigation }: NativeStackScreenProps<ParamListBase>) {
  const { blue, purple, green } = React.useContext(Context);

  return (
    <View style={styles.flexOne}>
      <Animated.View sharedTransitionTag={blue} style={styles.blueBoxScreenTwo}>
        <Animated.View
          sharedTransitionTag={purple}
          style={styles.purpleBoxScreenTwo}>
          <Animated.View
            style={styles.greenBoxScreenTwo}
            sharedTransitionTag={green}
          />
        </Animated.View>
      </Animated.View>
      <Button title="go back" onPress={() => navigation.popTo('Screen1')} />
    </View>
  );
}

const Screen1 = withSharedTransitionBoundary(Screen1Content);
const Screen2 = withSharedTransitionBoundary(Screen2Content);

export default function NestedRotationExample() {
  const [blue, setBlue] = React.useState<string | undefined>(undefined);
  const [purple, setPurple] = React.useState<string | undefined>(undefined);
  const [green, setGreen] = React.useState<string | undefined>('greenTag');
  const [modals, setModals] = React.useState(true);

  const Provider = Context;

  return (
    <Provider
      value={{
        blue,
        purple,
        green,
      }}>
      <Button
        title="share all"
        onPress={() => {
          setBlue('blueTag');
          setPurple('purpleTag');
          setGreen('greenTag');
        }}
      />
      <Button
        title="share purple and green"
        onPress={() => {
          setBlue(undefined);
          setPurple('purpleTag');
          setGreen('greenTag');
        }}
      />
      <Button
        title="share green"
        onPress={() => {
          setBlue(undefined);
          setPurple(undefined);
          setGreen('greenTag');
        }}
      />
      <Button
        title="share nothing"
        onPress={() => {
          setBlue(undefined);
          setPurple(undefined);
          setGreen(undefined);
        }}
      />
      <Button
        title={modals ? 'disable modals' : 'enable modals'}
        onPress={() => setModals(!modals)}
      />
      <Stack.Navigator
        screenOptions={{
          presentation: modals ? 'modal' : undefined,
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
    </Provider>
  );
}

const styles = StyleSheet.create({
  flexOne: { flex: 1 },
  blueBoxScreenOne: {
    borderRadius: 10,
    marginTop: 50,
    marginBottom: 100,
    width: 300,
    height: 300,
    backgroundColor: 'blue',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    transform: [{ skewX: '15deg' }, { rotate: '10deg' }, { translateX: 30 }],
  },
  blueBoxScreenTwo: {
    borderRadius: 10,
    marginTop: 50,
    marginBottom: 100,
    width: 300,
    height: 300,
    backgroundColor: 'blue',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    transform: [{ rotate: '170deg' }],
  },
  purpleBoxScreenOne: {
    borderRadius: 10,
    width: 200,
    height: 130,
    backgroundColor: 'purple',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    transform: [{ rotate: '10deg' }, { translateX: 30 }],
  },
  purpleBoxScreenTwo: {
    borderRadius: 10,
    width: 200,
    height: 130,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: 'purple',
    transform: [{ rotate: '170deg' }, { skewX: '25deg' }],
  },
  greenBoxScreenOne: {
    borderRadius: 10,
    width: 50,
    height: 50,
    alignSelf: 'center',
    backgroundColor: 'green',
    transform: [
      { rotate: '40deg' },
      { translateX: 50 },
      { skewX: '10deg' },
      { scaleX: 1.5 },
    ],
  },
  greenBoxScreenTwo: {
    borderRadius: 10,
    width: 50,
    height: 50,
    backgroundColor: 'green',
    transform: [
      { rotate: '140deg' },
      { translateX: -10 },
      { skewX: '20deg' },
      { scaleY: 2 },
    ],
  },
});
