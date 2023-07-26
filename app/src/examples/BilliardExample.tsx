/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React from 'react';
import { SafeAreaView, useColorScheme, TextInput } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';

import { Colors } from 'react-native/Libraries/NewAppScreen';
import CircleSlider from '../CircleSlider';

const AnimatedInput = Animated.createAnimatedComponent(TextInput);

function App(): JSX.Element {
  const isDarkMode = useColorScheme() === 'dark';

  const backgroundStyle = {
    backgroundColor: isDarkMode ? Colors.darker : Colors.lighter,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  };

  const handleChange = (value) => console.log(value);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={backgroundStyle}>
        <CircleSlider
          width={325}
          height={325}
          value={0}
          meterColor={'#ffffff'}
          onValueChange={handleChange}>
          {(animatedProps) => (
            <AnimatedInput
              keyboardType="numeric"
              maxLength={3}
              selectTextOnFocus={false}
              animatedProps={animatedProps}
            />
          )}
        </CircleSlider>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

export default App;
