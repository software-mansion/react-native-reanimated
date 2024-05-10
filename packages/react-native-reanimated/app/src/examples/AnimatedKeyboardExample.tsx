import Animated, {
  KeyboardState,
  useAnimatedKeyboard,
  useAnimatedStyle,
} from 'react-native-reanimated';
import {
  Button,
  Keyboard,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import React from 'react';

const BOX_SIZE = 50;

function NestedView() {
  useAnimatedKeyboard();
  return <View style={styles.nestedView} />;
}

export default function AnimatedKeyboardExample() {
  const keyboard = useAnimatedKeyboard();
  const OPENING = KeyboardState.OPENING;
  const style = useAnimatedStyle(() => {
    const color = keyboard.state.value === OPENING ? 'red' : 'blue';

    return {
      backgroundColor: color,
    };
  });
  const translateStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: -keyboard.height.value }],
    };
  });
  const [shouldShowNestedView, setShouldShowNestedView] = React.useState(false);

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardDismissMode="interactive"
      scrollEnabled={false}>
      <Animated.View style={[styles.box, style]} />
      <Button
        title="Toggle nested view"
        onPress={() => {
          setShouldShowNestedView(!shouldShowNestedView);
        }}
      />
      {shouldShowNestedView ? <NestedView /> : null}
      <Animated.View style={translateStyle}>
        <Button
          title="Dismiss"
          onPress={() => {
            Keyboard.dismiss();
          }}
        />
        <TextInput style={styles.textInput} autoCorrect />
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 70,
  },
  box: { width: BOX_SIZE, height: BOX_SIZE, marginBottom: 100 },
  textInput: {
    borderColor: 'blue',
    borderStyle: 'solid',
    borderWidth: 2,
    height: 60,
    width: 200,
  },
  nestedView: {
    width: 100,
    height: 100,
    backgroundColor: '#ffff00',
  },
});
