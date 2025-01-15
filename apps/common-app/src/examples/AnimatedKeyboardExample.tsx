import React from 'react';
import Animated, {
  useAnimatedKeyboard,
  useAnimatedStyle,
  useAnimatedProps,
} from 'react-native-reanimated';
import {
  Keyboard,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
  Text,
} from 'react-native';

Animated.addWhitelistedNativeProps({ text: true });
const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

const KeyboardStateToName = {
  0: 'UNKNOWN',
  1: 'OPENING',
  2: 'OPEN',
  3: 'CLOSING',
  4: 'CLOSED',
};

function getRandomColor() {
  const letters = '0123456789ABCDEF';
  let color = '#';
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}

function RandomView({ number }: { number: number }) {
  const color = getRandomColor();
  return (
    <View style={[styles.randomView, { backgroundColor: color }]}>
      <Text>Random view {number}</Text>
    </View>
  );
}

export default function AnimatedKeyboardExample() {
  const keyboard = useAnimatedKeyboard();

  const translateStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: -keyboard.height.value }],
    };
  });

  const animatedHeightProps = useAnimatedProps(() => {
    const text = `Keyboard height: ${keyboard.height.value}`;
    return { text, defaultValue: text };
  });

  const animatedStateProps = useAnimatedProps(() => {
    const text = `Keyboard state: ${KeyboardStateToName[keyboard.state.value]} - ${keyboard.state.value}`;
    return { text, defaultValue: text };
  });

  return (
    <>
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardDismissMode="interactive"
        scrollEnabled={true}>
        {Array.from({ length: 10 }).map((_, index) => {
          return <RandomView key={index} number={index} />;
        })}
      </ScrollView>
      <Animated.View style={[styles.accessoryBar, translateStyle]}>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            autoCorrect
            defaultValue="press me!!!"
          />
        </View>
        <TouchableOpacity
          style={styles.button}
          onPress={() => {
            Keyboard.dismiss();
          }}>
          <Text>Dismiss</Text>
        </TouchableOpacity>
      </Animated.View>
      <View style={styles.infoContainer}>
        <AnimatedTextInput
          style={styles.infoText}
          editable={false}
          animatedProps={animatedHeightProps}
        />
        <AnimatedTextInput
          style={styles.infoText}
          editable={false}
          animatedProps={animatedStateProps}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 100,
  },
  infoContainer: {
    position: 'absolute',
    padding: 15,
    width: 300,
    borderBottomRightRadius: 20,
    backgroundColor: '#B0E0E6',
  },
  infoText: {
    fontWeight: '700',
    width: '100%',
  },
  accessoryBar: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    backgroundColor: '#B0E0E6',
    alignItems: 'center',
    flexDirection: 'row',
    padding: 20,
  },
  inputContainer: {
    flex: 5,
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginRight: 20,
  },
  textInput: {
    borderColor: 'indigo',
    borderStyle: 'solid',
    borderRadius: 20,
    borderWidth: 2,
    height: 55,
    width: '100%',
    paddingLeft: 20,
    fontWeight: '700',
  },
  button: {
    flex: 1,
    borderColor: 'indigo',
    borderStyle: 'solid',
    borderRadius: 20,
    borderWidth: 2,
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  randomView: {
    height: 150,
    width: 150,
    borderRadius: 20,
    margin: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
