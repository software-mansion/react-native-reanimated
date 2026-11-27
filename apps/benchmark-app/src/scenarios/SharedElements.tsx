import { NavigationContainer, useIsFocused } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  getStaticFeatureFlag,
  SharedTransitionBoundary,
} from 'react-native-reanimated';

import { range } from '../components/range';
import type { ScenarioProps } from './registry';

type Routes = {
  First: undefined;
  Second: undefined;
};

const Stack = createNativeStackNavigator<Routes>();

export function findSharedElementsUnmetRequirement() {
  return getStaticFeatureFlag('ENABLE_SHARED_ELEMENT_TRANSITIONS')
    ? undefined
    : 'ENABLE_SHARED_ELEMENT_TRANSITIONS is off';
}

export function SharedElements({ load }: ScenarioProps) {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{ headerShown: false }}
        screenLayout={({ children }) => (
          <ScreenBoundary>{children}</ScreenBoundary>
        )}>
        <Stack.Screen name="First">
          {(props) => <FirstScreen {...props} load={load} />}
        </Stack.Screen>
        <Stack.Screen name="Second">
          {(props) => <SecondScreen {...props} load={load} />}
        </Stack.Screen>
      </Stack.Navigator>
    </NavigationContainer>
  );
}

function ScreenBoundary({ children }: { children: ReactNode }) {
  const isFocused = useIsFocused();
  return (
    <SharedTransitionBoundary isActive={isFocused}>
      {children}
    </SharedTransitionBoundary>
  );
}

function FirstScreen({
  navigation,
  load,
}: NativeStackScreenProps<Routes, 'First'> & ScenarioProps) {
  useEffect(() => {
    const unsubscribe = navigation.addListener('transitionEnd', ({ data }) => {
      if (!data.closing) {
        navigation.navigate('Second');
      }
    });
    navigation.navigate('Second');
    return unsubscribe;
  }, [navigation]);

  return (
    <View style={[styles.screen, styles.row]}>
      {range(0, load).map((index) => (
        <Animated.View
          key={index}
          sharedTransitionTag={tagFor(index)}
          style={[styles.small, { backgroundColor: colorFor(index) }]}
        />
      ))}
    </View>
  );
}

function SecondScreen({
  navigation,
  load,
}: NativeStackScreenProps<Routes, 'Second'> & ScenarioProps) {
  useEffect(
    () =>
      navigation.addListener('transitionEnd', ({ data }) => {
        if (!data.closing) {
          navigation.goBack();
        }
      }),
    [navigation]
  );

  return (
    <View style={[styles.screen, styles.column]}>
      {range(0, load).map((index) => (
        <Animated.View
          key={index}
          sharedTransitionTag={tagFor(index)}
          style={[styles.large, { backgroundColor: colorFor(index) }]}
        />
      ))}
    </View>
  );
}

function tagFor(index: number) {
  return `shared-${index}`;
}

function colorFor(index: number) {
  return `hsl(${(index * 47) % 360}, 70%, 55%)`;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: 'white',
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignContent: 'flex-start',
    padding: 8,
  },
  column: {
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
    padding: 16,
  },
  small: {
    width: 32,
    height: 32,
    margin: 4,
  },
  large: {
    width: 160,
    height: 40,
    marginTop: 8,
    borderRadius: 12,
  },
});
