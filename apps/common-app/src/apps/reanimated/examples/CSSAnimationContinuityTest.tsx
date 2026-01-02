import {
  NavigationContainer,
  NavigationIndependentTree,
  useNavigation,
} from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as React from 'react';
import { useEffect, useState } from 'react';
import { Button, ScrollView, Text, View } from 'react-native';
import Animated, { css } from 'react-native-reanimated';

type TestStackParamList = {
  Test: undefined;
  Details: undefined;
};

type ScreenProp = NativeStackNavigationProp<TestStackParamList>;

const Stack = createNativeStackNavigator<TestStackParamList>();

function TestWrapper({
  title,
  Component,
}: {
  title: string;
  Component: React.ComponentType;
}) {
  return (
    <View style={styles.wrapper}>
      <Text style={styles.wrapperTitle}>{title}</Text>
      <View style={styles.navigatorContainer}>
        <NavigationIndependentTree>
          <NavigationContainer>
            <Stack.Navigator screenOptions={{ headerShown: false }}>
              <Stack.Screen name="Test" component={Component} />
              <Stack.Screen name="Details" component={DetailsScreen} />
            </Stack.Navigator>
          </NavigationContainer>
        </NavigationIndependentTree>
      </View>
    </View>
  );
}

function DetailsScreen() {
  const navigation = useNavigation<ScreenProp>();
  return (
    <View style={styles.centered}>
      <Text>Navigated Away (Animation hidden)</Text>
      <Button title="Go Back" onPress={() => navigation.goBack()} />
    </View>
  );
}

// 1. Simple Running Animation (Fill Mode, No Re-renders)
function SimpleNoRerender() {
  const navigation = useNavigation<ScreenProp>();
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Simple (No Re-renders)</Text>
      <Animated.View style={styles.simpleAnimationBox} />
      <Button
        title="Navigate Away"
        onPress={() => navigation.navigate('Details')}
      />
    </View>
  );
}

// 2. Simple Animation with Re-renders
function SimpleRerender() {
  const navigation = useNavigation<ScreenProp>();
  const [count, setCount] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setCount((c) => c + 1), 500);
    return () => clearInterval(id);
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Re-render: {count}</Text>
      <Animated.View style={styles.simpleAnimationBox} />
      <Button
        title="Navigate Away"
        onPress={() => navigation.navigate('Details')}
      />
    </View>
  );
}

// 3. Dynamic Delay with Re-renders
function DynamicDelay() {
  const navigation = useNavigation<ScreenProp>();
  const [count, setCount] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setCount((c) => c + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const dynamicStyle = css.create({
    box: {
      animationName: {
        from: { left: -300, backgroundColor: 'blue' },
        to: { left: 300, backgroundColor: 'orange' },
      },
      animationDuration: '20s',
      animationFillMode: 'forwards',
      animationDelay: `${count - 10}s`,
      animationTimingFunction: 'linear',
    },
  });

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Delay: {count - 10}s</Text>
      <Animated.View style={[styles.boxBase, dynamicStyle.box]} />
      <Button
        title="Navigate Away"
        onPress={() => navigation.navigate('Details')}
      />
    </View>
  );
}

// 4. Infinite Animation (No Re-renders)
function InfiniteNoRerender() {
  const navigation = useNavigation<ScreenProp>();
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Infinite Loop</Text>
      <Animated.View style={styles.infiniteAnimationBox} />
      <Button
        title="Navigate Away"
        onPress={() => navigation.navigate('Details')}
      />
    </View>
  );
}

// 5. Play State Test
function PlayState() {
  const navigation = useNavigation<ScreenProp>();
  const [paused, setPaused] = useState(false);
  return (
    <View style={styles.container}>
      <Text style={styles.text}>State: {paused ? 'PAUSED' : 'RUNNING'}</Text>
      <Button
        title={paused ? 'Resume' : 'Pause'}
        onPress={() => setPaused(!paused)}
      />
      <Animated.View
        style={[
          styles.infiniteAnimationBox,
          { animationPlayState: paused ? 'paused' : 'running' },
        ]}
      />
      <Button
        title="Navigate Away"
        onPress={() => navigation.navigate('Details')}
      />
    </View>
  );
}

export default function CSSAnimationContinuityTest() {
  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <Text style={styles.header}>CSS Animation Consistency Tests</Text>
      <TestWrapper
        title="1. Simple (No Re-render)"
        Component={SimpleNoRerender}
      />
      <TestWrapper
        title="2. Simple (With Re-render)"
        Component={SimpleRerender}
      />
      <TestWrapper title="3. Dynamic Delay" Component={DynamicDelay} />
      <TestWrapper title="4. Infinite Loop" Component={InfiniteNoRerender} />
      <TestWrapper title="5. Play State" Component={PlayState} />
    </ScrollView>
  );
}

const styles = css.create({
  scrollContent: {
    padding: 20,
    gap: 30,
    paddingBottom: 50,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  wrapper: {
    height: 300,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#f9f9f9',
  },
  wrapperTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    padding: 10,
    backgroundColor: '#eee',
    textAlign: 'center',
  },
  navigatorContainer: {
    flex: 1,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 15,
    padding: 10,
    backgroundColor: 'white',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    backgroundColor: '#eee',
  },
  text: {
    fontSize: 14,
    fontWeight: '500',
  },
  boxBase: {
    width: 60,
    height: 60,
    backgroundColor: 'red',
  },
  simpleAnimationBox: {
    width: 60,
    height: 60,
    animationName: {
      from: { left: -300, backgroundColor: 'red' },
      to: { left: 300, backgroundColor: 'green' },
    },
    animationDuration: '20s',
    animationFillMode: 'forwards',
    animationTimingFunction: 'linear',
  },
  infiniteAnimationBox: {
    width: 60,
    height: 60,
    animationName: {
      from: { left: -150, backgroundColor: 'red' },
      to: { left: 150, backgroundColor: 'blue' },
    },
    animationDuration: '2s',
    animationIterationCount: 'infinite',
    animationDirection: 'alternate',
    animationTimingFunction: 'linear',
  },
});
