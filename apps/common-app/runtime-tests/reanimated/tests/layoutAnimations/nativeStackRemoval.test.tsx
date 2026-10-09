import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  LinearTransition,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import {
  describe,
  notify,
  render,
  test,
  waitForNotification,
} from '../../../ReJest/RuntimeTestsApi';

const SIGN_OUTS = 6;
const DELAYS = [60, 180, 420, 900, 30, 1300];
const SIGNED_OUT = 'nativeStackSignedOut';

function Pulse({ header }: { header?: boolean }) {
  const width = useSharedValue(header ? 10 : 40);
  useEffect(() => {
    width.value = withRepeat(
      withTiming(header ? 30 : 160, { duration: 250 }),
      -1,
      true
    );
  }, [header, width]);
  const style = useAnimatedStyle(() => ({ width: width.value }));
  return (
    <Animated.View
      style={[header ? styles.headerPulse : styles.pulse, style]}
    />
  );
}

function HeaderButton({ label }: { label: string }) {
  return (
    <View collapsable={false} style={styles.headerButton}>
      <Pulse header />
      <Animated.View
        entering={FadeIn.duration(200)}
        exiting={FadeOut.duration(300)}
        style={styles.dot}
      />
      <Text>{label}</Text>
    </View>
  );
}

function Content({ name }: { name: string }) {
  return (
    <View collapsable={false} style={styles.content}>
      <Text>{name}</Text>
      <Pulse />
      <Animated.View
        layout={LinearTransition}
        entering={FadeIn.duration(200)}
        style={styles.box}
      />
      <Animated.View exiting={FadeOut.duration(400)} style={styles.other}>
        <View collapsable={false} style={styles.nested} />
      </Animated.View>
    </View>
  );
}

const headerOptions = (title: string) => ({
  title,
  headerLeft: () => <HeaderButton label="L" />,
  headerRight: () => <HeaderButton label="R" />,
});

const Outer = createNativeStackNavigator<{
  App: undefined;
  SignIn: undefined;
}>();
const Inner = createNativeStackNavigator<{
  Home: undefined;
  Details: undefined;
}>();

function Home() {
  return <Content name="Home" />;
}

function Details() {
  return <Content name="Details" />;
}

function SignIn() {
  return <Content name="SignIn" />;
}

function App() {
  return (
    <Inner.Navigator>
      <Inner.Screen
        name="Home"
        component={Home}
        options={headerOptions('Home')}
      />
      <Inner.Screen
        name="Details"
        component={Details}
        options={headerOptions('Details')}
      />
    </Inner.Navigator>
  );
}

// Signing out removes the outer App screen together with the nested stack and its header buttons.
function SignInLoop() {
  const [step, setStep] = useState(0);
  const signedIn = step % 2 === 1;
  useEffect(() => {
    if (step === SIGN_OUTS * 2) {
      notify(SIGNED_OUT);
      return;
    }
    const timeout = setTimeout(
      () => setStep((current) => current + 1),
      DELAYS[step % DELAYS.length]
    );
    return () => clearTimeout(timeout);
  }, [step]);
  return (
    <View style={styles.root}>
      <NavigationContainer>
        <Outer.Navigator>
          {signedIn ? (
            <Outer.Screen
              name="App"
              component={App}
              options={{ headerShown: false }}
            />
          ) : (
            <Outer.Screen
              name="SignIn"
              component={SignIn}
              options={headerOptions('SignIn')}
            />
          )}
        </Outer.Navigator>
      </NavigationContainer>
    </View>
  );
}

describe('Layout animations on native stack removal', () => {
  // Before react-native-screens 4.27, Android crashes with "ScreenStackFragment added into a
  // non-stack container" when a screen is removed before its children.
  test('removes a screen that holds a nested stack with header buttons', async () => {
    await render(<SignInLoop />);
    await waitForNotification(SIGNED_OUT, 30_000);
    await render(null);
  });
});

const styles = StyleSheet.create({
  root: { width: 380, height: 700 },
  content: { flex: 1, padding: 10, backgroundColor: 'white' },
  pulse: { height: 20, backgroundColor: '#22aa55' },
  headerPulse: { height: 6, backgroundColor: '#22aa55' },
  headerButton: { flexDirection: 'row', alignItems: 'center' },
  dot: { width: 8, height: 8, backgroundColor: '#dd2222' },
  box: { width: 100, height: 40, backgroundColor: '#2277dd' },
  other: { width: 100, height: 40, backgroundColor: '#dd5522' },
  nested: { width: 50, height: 20, backgroundColor: '#ddaa22' },
});
