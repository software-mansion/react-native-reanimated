import Animated, { SlideOutLeft } from 'react-native-reanimated';
import { Button, StyleSheet, View, Text } from 'react-native';

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

const Stack = createNativeStackNavigator();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function First({ navigation }: { navigation: any }) {
  return (
    <>
      <Button title="Navigate" onPress={() => navigation.navigate('Second')} />
      <View style={{ ...styles.container, backgroundColor: 'red' }} />
    </>
  );
}

function Second() {
  const [state, setState] = React.useState(false);
  return (
    <>
      <Button title="Toggle" onPress={() => setState((prev) => !prev)} />
      <View style={{ ...styles.container, backgroundColor: 'red' }}>
        {state && (
          <Animated.View
            exiting={SlideOutLeft.duration(5000)}
            style={{ ...styles.box, backgroundColor: 'blue' }}
          />
        )}
      </View>
    </>
  );
}

export function NestedNativeStacksWithLayout() {
  const [visible, setVisible] = React.useState(true);

  return (
    <>
      <Button title="Toggle" onPress={() => setVisible((prev) => !prev)} />
      {visible && (
        <>
          <Text>HAHAHA</Text>
          <Stack.Navigator initialRouteName="First">
            <Stack.Screen name="First" component={First} />
            <Stack.Screen name="Second" component={Second} />
          </Stack.Navigator>
        </>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    marginTop: 300,
  },
  box: {
    width: 100,
    height: 100,
  },
});
