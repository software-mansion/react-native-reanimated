import React from 'react';
import {
  Keyboard,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  KeyboardState,
  useAnimatedKeyboard,
  useAnimatedProps,
  useAnimatedStyle,
} from 'react-native-reanimated';

const KeyboardStateNames = {
  [KeyboardState.UNKNOWN]: 'UNKNOWN',
  [KeyboardState.OPENING]: 'OPENING',
  [KeyboardState.OPEN]: 'OPEN',
  [KeyboardState.CLOSING]: 'CLOSING',
  [KeyboardState.CLOSED]: 'CLOSED',
};

function getRandomColor() {
  const letters = '0123456789ABCDEF';
  let color = '#';
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}

function RandomView({ id }: { id: number }) {
  const color = React.useMemo(() => {
    return getRandomColor();
  }, []);

  return (
    <View style={[styles.randomView, { backgroundColor: color }]}>
      <Text>Random view {id}</Text>
    </View>
  );
}

export default function AnimatedKeyboardExample() {
  const keyboard = useAnimatedKeyboard();
  const [inputFocused, setInputFocused] = React.useState(false);

  const translateStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: -keyboard.height.value }],
    };
  });

  const animatedHeightProps = useAnimatedProps(() => {
    return {
      text: `Keyboard height: ${keyboard.height.value}`,
    };
  });

  const animatedStateProps = useAnimatedProps(() => {
    return {
      text: `Keyboard state: ${KeyboardStateNames[keyboard.state.value]} - ${keyboard.state.value}`,
    };
  });

  return (
    <>
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardDismissMode="interactive"
        scrollEnabled={true}>
        {Array.from({ length: 10 }).map((_, index) => {
          return <RandomView key={index} id={index} />;
        })}
      </ScrollView>
      <Animated.View style={[styles.accessoryBar, translateStyle]}>
        <View style={styles.inputContainer}>
          <TextInput
            style={[
              styles.textInput,
              { backgroundColor: inputFocused ? '#FFFFFF' : '#DCDCDC' },
            ]}
            autoCorrect
            defaultValue="press me!!!"
            onFocus={() => setInputFocused(true)}
            onBlur={() => setInputFocused(false)}
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
        <Animated.Text
          style={styles.infoText}
          animatedProps={animatedHeightProps}
        />
        <Animated.Text
          style={styles.infoText}
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
