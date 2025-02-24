import { useIsFocused, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as React from 'react';
import { useEffect, useState } from 'react';
import { Freeze } from 'react-freeze';
import { Button, Text, View } from 'react-native';
import Animated, {
  css,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { NukeContext } from '@/App';

type RootStackParamList = {
  screen1: undefined;
  screen2: undefined;
  screen3: undefined;
};

type FirstScreenProp = NativeStackNavigationProp<RootStackParamList>;

const AnimatedSwitch = () => {
  const isOn = useSharedValue(false);

  const handleToggle = () => {
    isOn.set((x) => !x);
  };

  const animatedStyles = useAnimatedStyle(() => {
    return {
      backgroundColor: withTiming(isOn.get() ? '#4caf50' : '#6666', {
        duration: 300,
      }),
      transform: [
        { translateX: withTiming(isOn.get() ? 20 : 0, { duration: 300 }) },
      ],
    };
  });

  return (
    <View style={styles.switchContainer} onTouchEnd={handleToggle}>
      <Animated.View style={[styles.toggle, animatedStyles]} />
    </View>
  );
};

const CSSAnimation = () => {
  return (
    <Animated.View style={styles.animationBox}>
      <Text>CSS animation</Text>
    </Animated.View>
  );
};

const CSSTransition = () => {
  const [state, setState] = useState(true);

  useEffect(() => {
    setState((x) => !x);
  }, []);

  return (
    <Animated.View style={[styles.transitionBox, { left: state ? -100 : 100 }]}>
      <Text>CSS transition</Text>
    </Animated.View>
  );
};

const AnimatedStyleAnimation = () => {
  const sv = useSharedValue(-100);

  useEffect(() => {
    sv.value = 100;
  }, [sv]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      left: withDelay(
        1000,
        withTiming(sv.value, { duration: 10000, easing: Easing.linear })
      ),
    };
  });

  return (
    <Animated.View style={[styles.box, animatedStyle]}>
      <Text>animated style</Text>
    </Animated.View>
  );
};

function HomeScreen() {
  const nuke = React.useContext(NukeContext);
  const navigation = useNavigation<FirstScreenProp>();
  const [freezed, setFreezed] = useState(false);
  const isFocused = useIsFocused();

  useEffect(() => {
    if (isFocused) {
      setFreezed(false);
    }
  }, [isFocused]);

  return (
    <Freeze freeze={freezed}>
      <View style={styles.container}>
        <Text>Home Screen</Text>
        <Button
          onPress={() => {
            setFreezed(true);
            navigation.navigate('screen1');
          }}
          title="Go to screen 1"
        />
        <Button onPress={nuke} title="Check for registry leaks" />
        <AnimatedSwitch />
        <CSSAnimation />
        <CSSTransition />
        <AnimatedStyleAnimation />
      </View>
    </Freeze>
  );
}

function Screen1() {
  const nuke = React.useContext(NukeContext);
  const navigation = useNavigation<FirstScreenProp>();
  return (
    <View style={styles.container}>
      <Text>Screen 1</Text>
      <Button
        onPress={() => navigation.navigate('screen2')}
        title="Go to screen 2"
      />
      <Button onPress={nuke} title="Check for registry leaks" />
      <Button onPress={() => navigation.goBack()} title="Go Back" />
    </View>
  );
}

function Screen2() {
  const navigation = useNavigation<FirstScreenProp>();
  return (
    <View style={styles.container}>
      <Text>Screen 2</Text>
      <Button
        onPress={() => navigation.navigate('screen3')}
        title="Go to screen 3"
      />
      <Button onPress={() => navigation.goBack()} title="Go back" />
    </View>
  );
}

function Screen3() {
  const navigation = useNavigation();
  return (
    <View style={styles.container}>
      <Text>Screen 3</Text>
      <Button onPress={() => navigation.goBack()} title="Go back" />
    </View>
  );
}

type StackParamList = {
  home: undefined;
  screen1: undefined;
  screen2: undefined;
  screen3: undefined;
};

const Stack = createNativeStackNavigator<StackParamList>({
  initialRouteName: 'home',
  screens: {
    home: HomeScreen,
    screen1: Screen1,
    screen2: Screen2,
    screen3: Screen3,
  },
});

export default function App() {
  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false }}
      initialRouteName="home">
      <Stack.Screen name="home" component={HomeScreen} />
      <Stack.Screen name="screen1" component={Screen1} />
      <Stack.Screen name="screen2" component={Screen2} />
      <Stack.Screen name="screen3" component={Screen3} />
    </Stack.Navigator>
  );
}

const styles = css.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    rowGap: 40,
  },
  switchContainer: {
    width: 50,
    height: 25,
    backgroundColor: '#ccc',
    borderRadius: 25,
    padding: 2,
  },
  toggle: {
    height: 21,
    width: 21,
    borderRadius: 10.5,
    backgroundColor: '#fff',
  },
  animationBox: {
    width: 100,
    height: 50,
    animationDelay: '1s',
    animationDuration: '10s',
    animationFillMode: 'forwards',
    animationName: {
      from: {
        backgroundColor: 'red',
        left: -100,
      },
      to: {
        backgroundColor: 'green',
        left: 100,
      },
    },
  },
  transitionBox: {
    width: 100,
    height: 50,
    backgroundColor: 'blue',
    transitionDelay: '1s',
    transitionDuration: '10s',
    transitionProperty: 'left',
  },
  box: {
    width: 100,
    height: 50,
    backgroundColor: 'pink',
    transitionDelay: '1s',
    transitionDuration: '20s',
    transitionProperty: 'left',
  },
});
