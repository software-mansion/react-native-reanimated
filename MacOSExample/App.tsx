/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React from 'react';
import {Text, View} from 'react-native';
import {useSharedValue} from 'react-native-reanimated';

function App(): JSX.Element {
  const value = useSharedValue(10);

  return (
    <View>
      <Text>Hello macOS</Text>
      <Text>{value.value}</Text>
    </View>
  );
}

export default App;
