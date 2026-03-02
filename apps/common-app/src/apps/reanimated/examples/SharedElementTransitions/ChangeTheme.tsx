'use strict';
import type { ParamListBase } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import { Button, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Layout,
  SharedTransition,
  withSpring,
} from 'react-native-reanimated';

import { withSharedTransitionBoundary } from './withSharedTransitionBoundary';

const Stack = createNativeStackNavigator();
const Context = createContext({
  theme: true,
  disabled: false,
  modals: false,
  toggleTheme: () => {},
  toggleDisabled: () => {},
  toggleModals: () => {},
});

function getTheme(theme: boolean, disabled: boolean) {
  const style = theme
    ? { backgroundColor: 'purple' }
    : { backgroundColor: 'pink' };
  // const config = { duration: 1300 };
  // const customTransition = SharedTransition.custom((values) => {
  //   'worklet';
  //   return {
  //     width: withSpring(values.targetWidth, config),
  //     height: withSpring(values.targetHeight, config),
  //     originX: withSpring(values.targetOriginX, config),
  //     originY: withSpring(values.targetOriginY, config),
  //     borderRadius: withSpring(values.targetBorderRadius, config),
  //   };
  // })
  //   .progressAnimation((values, progress) => {
  //     'worklet';
  //     const getValue = (
  //       progress: number,
  //       target: number,
  //       current: number
  //     ): number => {
  //       return (
  //         (2 * progress * progress - progress) * (target - current) + current
  //       );
  //     };
  //     return {
  //       width: getValue(progress, values.targetWidth, values.currentWidth),
  //       height: getValue(progress, values.targetHeight, values.currentHeight),
  //       originX: getValue(
  //         progress,
  //         values.targetOriginX,
  //         values.currentOriginX
  //       ),
  //       originY: getValue(
  //         progress,
  //         values.targetOriginY,
  //         values.currentOriginY
  //       ),
  //       borderRadius: getValue(
  //         progress,
  //         values.targetBorderRadius,
  //         values.currentBorderRadius
  //       ),
  //     };
  //   })
  //   .defaultTransitionType(SharedTransitionType.ANIMATION);
  const transition = undefined;
  // const transition = disabled
  //   ? undefined
  //   : theme
  //     ? customTransition
  //     : new SharedTransition();

  return { style, transition };
}

function Screen1Content({ navigation }: NativeStackScreenProps<ParamListBase>) {
  const { theme, disabled, modals, toggleTheme, toggleDisabled, toggleModals } =
    useContext(Context);
  const { style, transition } = useMemo(
    () => getTheme(theme, disabled),
    [theme, disabled]
  );
  return (
    <Animated.ScrollView style={styles.flexOne}>
      <Text style={styles.text}>Current theme: {theme ? 1 : 2}</Text>
      <Button title="toggle theme" onPress={toggleTheme} />
      <Button
        title={(disabled ? 'enable' : 'disable') + ' transition'}
        onPress={toggleDisabled}
      />
      <Button
        title={(!modals ? 'enable' : 'disable') + ' modals'}
        onPress={toggleModals}
      />
      <Animated.View
        key={0}
        style={[styles.boxScreenOne, style]}
        sharedTransitionTag={disabled ? undefined : 'tag'}
        layout={Layout}
        sharedTransitionStyle={transition}>
        <Animated.Text
          sharedTransitionTag={disabled ? undefined : 'textTag'}
          sharedTransitionStyle={transition}
          style={styles.text}>
          0
        </Animated.Text>
      </Animated.View>
      <Animated.View
        key={theme ? 1 : 2}
        style={[styles.boxScreenOne, style]}
        sharedTransitionTag={disabled ? undefined : theme ? 'tag1' : 'tag2'}
        layout={Layout}
        sharedTransitionStyle={transition}>
        <Animated.Text
          sharedTransitionTag={
            disabled ? undefined : theme ? 'textTag1' : 'textTag2'
          }
          sharedTransitionStyle={transition}
          style={styles.text}>
          {theme ? 1 : 2}
        </Animated.Text>
      </Animated.View>
      <Animated.View
        key={theme ? 2 : 1}
        style={[styles.boxScreenOne, style]}
        sharedTransitionTag={disabled ? undefined : theme ? 'tag2' : 'tag1'}
        layout={Layout}
        sharedTransitionStyle={transition}>
        <Animated.Text
          sharedTransitionTag={
            disabled ? undefined : theme ? 'textTag2' : 'textTag1'
          }
          sharedTransitionStyle={transition}
          style={styles.text}>
          {theme ? 2 : 1}
        </Animated.Text>
      </Animated.View>
      <Button
        onPress={() => navigation.navigate('Screen2')}
        title="go to screen2"
      />
      <Button
        onPress={() => navigation.navigate('Screen3')}
        title="go to screen3"
      />
    </Animated.ScrollView>
  );
}

function Screen2Content({ navigation }: NativeStackScreenProps<ParamListBase>) {
  const { theme, disabled, toggleTheme, toggleDisabled } = useContext(Context);
  const { style, transition } = useMemo(
    () => getTheme(theme, disabled),
    [theme, disabled]
  );
  return (
    <View style={styles.flexOne}>
      <Text style={styles.text}>Current theme: {theme ? 1 : 2}</Text>
      <Button title="toggle theme" onPress={toggleTheme} />
      <Button
        title={(disabled ? 'enable' : 'disable') + ' transition'}
        onPress={toggleDisabled}
      />
      <Animated.View
        style={[styles.boxScreenTwo, style]}
        sharedTransitionTag={disabled ? undefined : 'tag'}
        sharedTransitionStyle={transition}>
        <Animated.Text
          sharedTransitionTag={disabled ? undefined : 'textTag'}
          sharedTransitionStyle={transition}
          style={styles.text}>
          0
        </Animated.Text>
      </Animated.View>
      <Animated.View
        style={[styles.boxScreenTwo, style]}
        sharedTransitionTag={disabled ? undefined : 'tag1'}
        sharedTransitionStyle={transition}>
        <Animated.Text
          sharedTransitionTag={disabled ? undefined : 'textTag1'}
          sharedTransitionStyle={transition}
          style={styles.text}>
          1
        </Animated.Text>
      </Animated.View>
      <Animated.View
        style={[styles.boxScreenTwo, style]}
        sharedTransitionTag={disabled ? undefined : 'tag2'}
        sharedTransitionStyle={transition}>
        <Animated.Text
          sharedTransitionTag={disabled ? undefined : 'textTag2'}
          sharedTransitionStyle={transition}
          style={styles.text}>
          2
        </Animated.Text>
      </Animated.View>
      <Button
        title="go to Screen3"
        onPress={() => navigation.navigate('Screen3')}
      />
      <Button
        title="go to Screen1"
        onPress={() => navigation.popTo('Screen1')}
      />
    </View>
  );
}

function Screen3Content({ navigation }: NativeStackScreenProps<ParamListBase>) {
  const { theme, disabled, toggleTheme, toggleDisabled } = useContext(Context);
  const { style, transition } = useMemo(
    () => getTheme(theme, disabled),
    [theme, disabled]
  );
  return (
    <View style={styles.flexOne}>
      <Text style={styles.text}>Current theme: {theme ? 1 : 2}</Text>
      <Button title="toggle theme" onPress={toggleTheme} />
      <Button
        title={(disabled ? 'enable' : 'disable') + ' transition'}
        onPress={toggleDisabled}
      />
      <Animated.View
        style={[styles.boxScreenThree, style]}
        sharedTransitionTag={disabled ? undefined : 'tag'}
        sharedTransitionStyle={transition}>
        <Animated.Text
          sharedTransitionTag={disabled ? undefined : 'textTag'}
          sharedTransitionStyle={transition}
          style={styles.text}>
          0
        </Animated.Text>
      </Animated.View>
      <Animated.View
        style={[styles.boxScreenThree, style]}
        sharedTransitionTag={disabled ? undefined : 'tag1'}
        sharedTransitionStyle={transition}>
        <Animated.Text
          sharedTransitionTag={disabled ? undefined : 'textTag1'}
          sharedTransitionStyle={transition}
          style={styles.text}>
          1
        </Animated.Text>
      </Animated.View>
      <Animated.View
        style={[styles.boxScreenThree, style]}
        sharedTransitionTag={disabled ? undefined : 'tag2'}
        sharedTransitionStyle={transition}>
        <Animated.Text
          sharedTransitionTag={disabled ? undefined : 'textTag2'}
          sharedTransitionStyle={transition}
          style={styles.text}>
          2
        </Animated.Text>
      </Animated.View>
      <Button
        onPress={() => navigation.popTo('Screen1')}
        title="go to screen1"
      />
      <Button
        title="go to Screen2"
        onPress={() => navigation.popTo('Screen2')}
      />
    </View>
  );
}

const Screen1 = withSharedTransitionBoundary(Screen1Content);
const Screen2 = withSharedTransitionBoundary(Screen2Content);
const Screen3 = withSharedTransitionBoundary(Screen3Content);

export default function ChangeThemeExample() {
  const [theme, setTheme] = useState(true);
  const [disabled, setDisabled] = useState(false);
  const [modals, setModals] = useState(false);

  const toggleTheme = useCallback(() => setTheme((theme) => !theme), []);
  const toggleDisabled = useCallback(() => setDisabled((d) => !d), []);
  const toggleModals = useCallback(() => setModals((m) => !m), []);

  const Provider = Context;

  return (
    <Provider
      value={{
        theme,
        disabled,
        modals,
        toggleTheme,
        toggleDisabled,
        toggleModals,
      }}>
      <Stack.Navigator
        screenOptions={{
          presentation: modals ? 'modal' : undefined,
          animation: 'flip',
        }}>
        <Stack.Screen
          name="Screen1"
          component={Screen1}
          options={{ headerShown: !theme }}
        />
        <Stack.Screen
          name="Screen2"
          component={Screen2}
          options={{ headerShown: true }}
        />
        <Stack.Screen
          name="Screen3"
          component={Screen3}
          options={{ headerShown: false }}
        />
      </Stack.Navigator>
    </Provider>
  );
}

const styles = StyleSheet.create({
  flexOne: { flex: 1 },
  boxScreenOne: {
    height: 80,
    width: 150,
    margin: 20,
    justifyContent: 'center',
    alignSelf: 'center',
    borderRadius: 10,
  },
  boxScreenTwo: {
    height: 80,
    width: 300,
    margin: 20,
    justifyContent: 'center',
    alignSelf: 'center',
    borderRadius: 10,
  },
  boxScreenThree: {
    height: 100,
    width: 300,
    margin: 20,
    alignSelf: 'center',
    justifyContent: 'center',
    borderRadius: 30,
  },
  text: {
    fontSize: 18,
    margin: 30,
    fontWeight: 'bold',
    alignSelf: 'center',
  },
});
