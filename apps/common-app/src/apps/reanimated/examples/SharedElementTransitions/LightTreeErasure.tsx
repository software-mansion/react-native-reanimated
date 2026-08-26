import type { ParamListBase } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as React from 'react';
import { Button, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';

import { withSharedTransitionBoundary } from './withSharedTransitionBoundary';

const Stack = createNativeStackNavigator();

const NAVIGATE_DELAY_MS = 250;

function Screen1Content({ navigation }: NativeStackScreenProps<ParamListBase>) {
  const offset = useSharedValue(0);
  const spacerHeight = useSharedValue(40);

  const boxStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: offset.value }],
  }));

  const spacerStyle = useAnimatedStyle(() => ({
    height: spacerHeight.value,
  }));

  const navigateSoon = () => {
    setTimeout(() => navigation.navigate('Screen2'), NAVIGATE_DELAY_MS);
  };

  return (
    <View style={styles.flexOne}>
      <Animated.View style={[styles.spacer, spacerStyle]} />
      <View style={styles.boxRow}>
        <View style={styles.layoutWireframe}>
          <Text style={styles.wireframeLabel}>layout x=0</Text>
        </View>
        <View style={styles.transformWireframe} />
        <Text style={styles.transformLabel}>translateX: 60</Text>
        <Animated.View
          sharedTransitionTag="erasureBox"
          style={[styles.box, boxStyle]}
        />
      </View>
      <Text style={styles.hint}>
        Both buttons shift the box to the green frame and then navigate after
        {' ' + String(NAVIGATE_DELAY_MS)} ms — before the settled value syncs
        back to React. The second button also grows the spacer, which commits a
        shadow-tree update for the box and erases the fresh transform from the
        light tree. Both transitions should start from the green frame; today
        the second one does not.
      </Text>
      <Button
        title="shift and go (control)"
        onPress={() => {
          offset.value = 60;
          navigateSoon();
        }}
      />
      <Button
        title="shift, erase and go (bug)"
        onPress={() => {
          offset.value = 60;
          spacerHeight.value = spacerHeight.value + 40;
          navigateSoon();
        }}
      />
    </View>
  );
}

function Screen2Content({ navigation }: NativeStackScreenProps<ParamListBase>) {
  return (
    <View style={styles.flexOne}>
      <Animated.View
        sharedTransitionTag="erasureBox"
        style={styles.boxScreenTwo}
      />
      <Button title="go back" onPress={() => navigation.popTo('Screen1')} />
    </View>
  );
}

const Screen1 = withSharedTransitionBoundary(Screen1Content);
const Screen2 = withSharedTransitionBoundary(Screen2Content);

export default function LightTreeErasureExample() {
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
  hint: {
    margin: 16,
  },
  spacer: {
    height: 40,
    backgroundColor: 'lightgray',
  },
  boxRow: {
    marginTop: 10,
    height: 124,
  },
  layoutWireframe: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 100,
    height: 100,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: 'red',
    justifyContent: 'center',
    alignItems: 'center',
  },
  transformWireframe: {
    position: 'absolute',
    left: 56,
    top: -4,
    width: 108,
    height: 108,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: 'green',
  },
  transformLabel: {
    position: 'absolute',
    left: 60,
    top: 106,
    fontSize: 12,
    color: 'green',
  },
  wireframeLabel: {
    fontSize: 12,
    color: 'red',
  },
  box: {
    width: 100,
    height: 100,
    backgroundColor: 'purple',
  },
  boxScreenTwo: {
    width: 200,
    height: 200,
    marginTop: 400,
    marginLeft: 150,
    backgroundColor: 'purple',
  },
});
