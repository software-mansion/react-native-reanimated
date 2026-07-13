/* eslint-disable @typescript-eslint/no-require-imports */
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { StackNavigationProp } from '@react-navigation/stack';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BackButton, DrawerButton } from '@/components';
import { createStack, IS_MACOS } from '@/utils';

import type { RuntimeTestSuite } from '../../../runtime-tests/types';

type RootStackParamList = {
  Tests: undefined;
  'Reanimated Tests': undefined;
  'Worklets Tests': undefined;
};

interface HomeScreenProps {
  navigation:
    | StackNavigationProp<RootStackParamList, 'Tests'>
    | NativeStackNavigationProp<RootStackParamList, 'Tests'>;
}

function HomeScreen({ navigation }: HomeScreenProps) {
  return (
    <View style={styles.container}>
      <Pressable
        style={styles.button}
        onPress={() => navigation.navigate('Reanimated Tests')}>
        <Text style={styles.title}>🐎 Reanimated Tests</Text>
      </Pressable>
      <Pressable
        style={styles.button}
        onPress={() => navigation.navigate('Worklets Tests')}>
        <Text style={styles.title}>🧵 Worklets Tests</Text>
      </Pressable>
    </View>
  );
}

function ReanimatedTestsScreen() {
  const RuntimeTestsRunner = (
    require('../../../runtime-tests/ReJest/RuntimeTestsRunner') as {
      default: React.ComponentType<{ tests: Array<RuntimeTestSuite> }>;
    }
  ).default;
  const { REANIMATED_TEST_SUITES } =
    require('../../../runtime-tests/reanimated/suites') as {
      REANIMATED_TEST_SUITES: Array<RuntimeTestSuite>;
    };
  return <RuntimeTestsRunner tests={REANIMATED_TEST_SUITES} />;
}

function WorkletsTestsScreen() {
  const RuntimeTestsRunner = (
    require('../../../runtime-tests/ReJest/RuntimeTestsRunner') as {
      default: React.ComponentType<{ tests: Array<RuntimeTestSuite> }>;
    }
  ).default;
  const { WORKLETS_TEST_SUITES } =
    require('../../../runtime-tests/worklets/suites') as {
      WORKLETS_TEST_SUITES: Array<RuntimeTestSuite>;
    };
  return <RuntimeTestsRunner tests={WORKLETS_TEST_SUITES} />;
}

const Stack = createStack<RootStackParamList>();

const screenOptions = {
  headerLeft: IS_MACOS ? undefined : () => <BackButton />,
  headerRight: IS_MACOS ? undefined : () => <DrawerButton />,
};

export default function App() {
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        component={HomeScreen}
        name="Tests"
        options={{
          headerTitle: '🧪 Runtime tests',
          title: 'Runtime tests',
        }}
      />
      <Stack.Screen
        component={ReanimatedTestsScreen}
        name="Reanimated Tests"
        options={{
          headerTitle: 'Reanimated runtime tests',
          title: 'Reanimated runtime tests',
        }}
      />
      <Stack.Screen
        component={WorkletsTestsScreen}
        name="Worklets Tests"
        options={{
          headerTitle: 'Worklets runtime tests',
          title: 'Worklets runtime tests',
        }}
      />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    backgroundColor: '#f8f9ff',
    borderColor: '#001a72',
    borderRadius: 10,
    borderWidth: 1,
    padding: 16,
  },
  container: {
    flex: 1,
    gap: 16,
    padding: 16,
  },
  title: {
    color: '#001a72',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
