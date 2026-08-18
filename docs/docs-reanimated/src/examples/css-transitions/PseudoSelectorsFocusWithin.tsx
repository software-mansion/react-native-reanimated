import React from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import Animated from 'react-native-reanimated';

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

export default function App() {
  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.card,
          {
            // highlight-start
            backgroundColor: {
              default: '#b58df122',
              ':focus-within': '#b58df1aa',
            },
            borderColor: { default: '#001a72', ':focus-within': '#782aeb' },
            // highlight-end
            transitionDuration: 350,
          },
        ]}>
        <AnimatedTextInput
          placeholder="Username"
          placeholderTextColor="#33488e"
          style={[
            styles.input,
            {
              borderColor: { default: '#001a72', ':focus': '#782aeb' },
              transitionDuration: 250,
            },
          ]}
        />
        <AnimatedTextInput
          placeholder="Password"
          placeholderTextColor="#33488e"
          secureTextEntry
          style={[
            styles.input,
            {
              borderColor: { default: '#001a72', ':focus': '#782aeb' },
              transitionDuration: 250,
            },
          ]}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  card: {
    borderRadius: 16,
    borderWidth: 2,
    gap: 12,
    marginVertical: 48,
    padding: 24,
  },
  input: {
    backgroundColor: '#87cce8',
    borderRadius: 10,
    borderWidth: 3,
    color: '#001a72',
    height: 44,
    paddingHorizontal: 16,
    width: 220,
  },
});
