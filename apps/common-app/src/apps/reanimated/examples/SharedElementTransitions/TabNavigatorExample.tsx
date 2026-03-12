import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React, { memo } from 'react';
import { Button, StyleSheet, Text, View } from 'react-native';
import Animated, { SharedTransitionBoundary } from 'react-native-reanimated';
import { withSharedTransitionBoundary } from './withSharedTransitionBoundary';
import { useIsFocused } from '@react-navigation/native';

function getStyle(index: number) {
  switch (index) {
    case 0:
      return styles.box1;
    case 1:
      return styles.box2;
    default:
      return styles.box3;
  }
}

type ScreenProps = {
  [key: string]: {
    id?: number;
    showButtons?: boolean;
  };
};

const ScreenContent = memo(
  ({ navigation, route }: NativeStackScreenProps<ScreenProps>) => {
    const id = route.params?.id ?? 0;
    const showButtons = !!route.params?.showButtons;

    return (
      <View style={styles.container}>
        <Text>Current id: {id}</Text>
        {showButtons && id < 2 && (
          <Button
            title={`Go next ${id + 1}`}
            onPress={() => navigation.push('Details', { id: id + 1 })}
          />
        )}
        {showButtons && id > 0 && (
          <Button
            onPress={() => navigation.push('Details', { id: id - 1 })}
            title={`Go next ${id - 1}`}
          />
        )}
        <Animated.View style={getStyle(id)} sharedTransitionTag="tag" />
      </View>
    );
  }
);

const Screen = withSharedTransitionBoundary(ScreenContent);

function createStack() {
  const Stack = createNativeStackNavigator();
  return () => (
    <Stack.Navigator>
      <Stack.Screen
        name="Details"
        initialParams={{ showButtons: true }}
        component={Screen as React.ComponentType}
      />
    </Stack.Navigator>
  );
}

const Tab = createBottomTabNavigator();
const StackA = createStack();
const StackB = createStack();

function FakeScreen({
  isActive,
  children,
}: {
  isActive: boolean;
  children: React.ReactNode;
}) {
  const isFocused = useIsFocused();
  return (
    <SharedTransitionBoundary isActive={isFocused && isActive}>
      <View style={styles.fakeScreen}>{children}</View>
    </SharedTransitionBoundary>
  );
}

function ScreenWithMultipleBoundaries() {
  const [activeBoundary, setActiveBoundary] = React.useState(0);

  return (
    <View style={styles.container}>
      <Button
        title="Switch boundary"
        onPress={() => setActiveBoundary((activeBoundary + 1) % 3)}
      />
      <FakeScreen isActive={activeBoundary === 0}>
        <Animated.View style={styles.minibox1} sharedTransitionTag="tag" />
      </FakeScreen>
      <FakeScreen isActive={activeBoundary === 1}>
        <Animated.View style={styles.minibox2} sharedTransitionTag="tag" />
      </FakeScreen>
      <FakeScreen isActive={activeBoundary === 2}>
        <Animated.View style={styles.minibox3} sharedTransitionTag="tag" />
      </FakeScreen>
    </View>
  );
}

function TabNavigatorExample() {
  return (
    <Tab.Navigator
      // `react-native-screens` detaches native views for inactive screens
      // this conflicts with shared element transitions as results in view disappearing
      // so we disable this behavior
      detachInactiveScreens={false}
      screenOptions={{ headerShown: false, animation: 'none' }}>
      <Tab.Screen
        name="A"
        initialParams={{ id: 0 }}
        component={Screen as React.ComponentType}
      />
      <Tab.Screen
        name="B"
        initialParams={{ id: 1 }}
        component={Screen as React.ComponentType}
      />
      <Tab.Screen name="C" component={StackA} />
      <Tab.Screen name="D" component={StackB} />
      <Tab.Screen name="E" component={ScreenWithMultipleBoundaries} />
      <Tab.Screen name="F" component={ScreenWithMultipleBoundaries} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 10,
    alignItems: 'center',
  },
  box1: {
    width: 100,
    height: 100,
    backgroundColor: 'green',
  },
  box2: {
    width: 200,
    height: 100,
    backgroundColor: 'blue',
  },
  box3: {
    width: 150,
    height: 250,
    backgroundColor: 'red',
    marginLeft: 50,
  },
  minibox1: {
    width: 50,
    height: 50,
    backgroundColor: 'green',
  },
  minibox2: {
    width: 100,
    height: 50,
    backgroundColor: 'blue',
  },
  minibox3: {
    width: 75,
    height: 125,
    backgroundColor: 'red',
    transform: [{ rotate: '45deg' }],
  },
  fakeScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'grey',
    marginVertical: 10,
    width: 200,
  },
});

export default TabNavigatorExample;
