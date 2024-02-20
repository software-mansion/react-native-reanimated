import {
  StyleSheet,
  TextInput,
  View,
  Dimensions,
  Text,
  useWindowDimensions,
} from 'react-native';
import React, { useState, useEffect } from 'react';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';

const useKeyboardHeightViewport = () => {
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const initialHeight = Dimensions.get('window').height;
    function onResize() {
      setKeyboardHeight(initialHeight - visualViewport.height);
    }
    const resizeListener = visualViewport?.addEventListener('resize', onResize);
    return () => {
      resizeListener.remove();
    };
  }, []);

  return keyboardHeight;
};

const useKeyboardHeightDimensions = () => {
  const [initialHeight, setInitialHeight] = useState(0);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const dimensions = useWindowDimensions();

  useEffect(() => {
    setInitialHeight(Dimensions.get('window').height);
  }, []);

  useEffect(() => {
    setKeyboardHeight(initialHeight - dimensions.height);
  }, [dimensions, initialHeight]);

  return keyboardHeight;
};

export default function AnimatedKeyboardExample() {
  const keyboardHeight = useKeyboardHeightDimensions(); //useKeyboardHeightViewport();
  const [text, setText] = useState('');

  const sv = useSharedValue(550);

  useEffect(() => {
    setText(`Current keyboard height is ${keyboardHeight}`);
    sv.value = withTiming(550 - keyboardHeight, { duration: 0 });
  }, [keyboardHeight, sv]);

  const animatedStyle = useAnimatedStyle(() => {
    return { height: sv.value };
  });

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      <Text>{text}</Text>
      <TextInput style={styles.textInput} />
      <View style={styles.measuringBox} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 5,
    borderColor: 'green',
  },
  textInput: {
    flex: 1,
    borderColor: 'blue',
    borderStyle: 'solid',
    borderWidth: 2,
    width: 200,
    marginVertical: 30,
  },
  measuringBox: {
    width: 300,
    flex: 5,
    borderColor: 'purple',
    borderWidth: 2,
  },
});
