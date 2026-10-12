import type { ParamListBase } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as React from 'react';
import { Button, StyleSheet, Switch, Text, View } from 'react-native';
import Animated, {
  getDynamicFeatureFlag,
  interpolateColor,
  LinearTransition,
  setDynamicFeatureFlag,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';

import { withSharedTransitionBoundary } from './withSharedTransitionBoundary';

const Stack = createNativeStackNavigator();

const FLAG = 'TRACK_SYNCHRONOUS_PROPS_IN_LAYOUT_ANIMATIONS';
const NAVIGATE_DELAY_MS = 250;

function Screen1Content({ navigation }: NativeStackScreenProps<ParamListBase>) {
  const [flagOn, setFlagOn] = React.useState(true);
  const offset = useSharedValue(0);
  const height = useSharedValue(100);
  const spacerHeight = useSharedValue(40);

  const boxSynchronousStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: offset.value }],
    backgroundColor: interpolateColor(
      offset.value,
      [0, 60],
      ['purple', 'orange']
    ),
  }));
  const boxHeightStyle = useAnimatedStyle(() => ({
    height: height.value,
  }));
  const spacerStyle = useAnimatedStyle(() => ({
    height: spacerHeight.value,
  }));

  const shift = () => {
    offset.value = offset.value === 0 ? 60 : 0;
  };
  const relayout = () => {
    spacerHeight.value = spacerHeight.value === 40 ? 120 : 40;
  };
  const navigationTimer =
    React.useRef<ReturnType<typeof setTimeout>>(undefined);
  React.useEffect(() => () => clearTimeout(navigationTimer.current), []);
  const navigateSoon = () => {
    navigationTimer.current = setTimeout(
      () => navigation.navigate('Screen2'),
      NAVIGATE_DELAY_MS
    );
  };

  return (
    <View style={styles.flexOne}>
      <View style={styles.row}>
        <Text style={styles.flagLabel}>Track synchronous props</Text>
        <Switch
          value={flagOn}
          onValueChange={(value) => {
            setDynamicFeatureFlag(FLAG, value);
            offset.value = 0;
            height.value = 100;
            setFlagOn(value);
          }}
        />
      </View>
      <Text style={styles.hint}>
        The purple box shifts through the synchronous path. With the flag on,
        every animation and transition starts from the shifted spot. With the
        flag off, the three combined buttons start from the stale layout
        position and log a warning. The switch remounts the box.
      </Text>
      <Button title="Shift (synchronous)" onPress={shift} />
      <Button
        title="Resize through a commit"
        onPress={() => {
          height.value = height.value === 100 ? 150 : 100;
        }}
      />
      <Button
        title="Shift, then relayout"
        onPress={() => {
          offset.value = 60;
          relayout();
        }}
      />
      <Button
        title="Shift, then navigate"
        onPress={() => {
          offset.value = 60;
          navigateSoon();
        }}
      />
      <Button
        title="Shift, relayout, then navigate"
        onPress={() => {
          offset.value = 60;
          relayout();
          navigateSoon();
        }}
      />
      <Animated.View style={[styles.spacer, spacerStyle]} />
      <Animated.View
        key={flagOn ? 'tracked' : 'untracked'}
        layout={LinearTransition.duration(800)}
        sharedTransitionTag="animatedBox"
        style={[styles.box, boxSynchronousStyle, boxHeightStyle]}
      />
      <Animated.View
        sharedTransitionTag="staticBox"
        style={styles.staticBoxScreenOne}
      />
    </View>
  );
}

function Screen2Content({ navigation }: NativeStackScreenProps<ParamListBase>) {
  return (
    <View style={styles.flexOne}>
      <Button title="go back" onPress={() => navigation.popTo('Screen1')} />
      <Animated.View
        sharedTransitionTag="animatedBox"
        style={styles.boxScreenTwo}
      />
      <Animated.View
        sharedTransitionTag="staticBox"
        style={styles.staticBoxScreenTwo}
      />
    </View>
  );
}

const Screen1 = withSharedTransitionBoundary(Screen1Content);
const Screen2 = withSharedTransitionBoundary(Screen2Content);

export default function SynchronousPropsExample() {
  React.useEffect(() => {
    const previous = getDynamicFeatureFlag(FLAG);
    setDynamicFeatureFlag(FLAG, true);
    return () => setDynamicFeatureFlag(FLAG, previous);
  }, []);

  return (
    <Stack.Navigator>
      <Stack.Screen name="Screen1" component={Screen1} />
      <Stack.Screen name="Screen2" component={Screen2} />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  flexOne: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    margin: 16,
  },
  flagLabel: {
    flex: 1,
    marginRight: 16,
  },
  hint: {
    marginHorizontal: 16,
  },
  spacer: {
    backgroundColor: 'lightgray',
  },
  box: {
    width: 100,
    backgroundColor: 'purple',
  },
  staticBoxScreenOne: {
    width: 100,
    height: 100,
    marginTop: 20,
    backgroundColor: 'green',
    transform: [{ translateX: 60 }],
  },
  boxScreenTwo: {
    width: 200,
    height: 200,
    marginTop: 260,
    marginLeft: 150,
    backgroundColor: 'purple',
  },
  staticBoxScreenTwo: {
    width: 150,
    height: 150,
    marginTop: 20,
    marginLeft: 200,
    backgroundColor: 'green',
  },
});
