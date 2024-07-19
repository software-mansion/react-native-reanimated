import Animated, {
  dispatchCommand,
  useAnimatedRef,
} from 'react-native-reanimated';
import {
  Button,
  SafeAreaView,
  StyleSheet,
  TextInput,
  View,
  Text,
  Alert,
  Pressable,
} from 'react-native';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import React, { useState } from 'react';

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

export default function LoginFormExample() {
  const loginReg = useAnimatedRef();
  const passwordRef = useAnimatedRef();

  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = () => {
    Alert.alert(`Welcome ${login}`, 'Successfully logged in!');
  };

  const focusLogin = Gesture.Tap().onStart(() => {
    dispatchCommand(loginReg, 'focus');
  });

  const focusPassword = Gesture.Tap().onStart(() => {
    dispatchCommand(passwordRef, 'focus');
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <GestureHandlerRootView style={styles.container}>
        <Text style={styles.title}>Login</Text>

        <AnimatedTextInput
          ref={loginReg}
          style={styles.input}
          placeholder="Login"
          value={login}
          onChangeText={setLogin}
        />

        <AnimatedTextInput
          ref={passwordRef}
          style={styles.input}
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <Pressable style={styles.loginButton} onPress={handleLogin}>
          <Text style={styles.loginButtonText}>Login</Text>
        </Pressable>
        <View style={styles.buttonContainer}>
          <GestureDetector gesture={focusLogin}>
            <View style={styles.button}>
              <Button title="Focus Login" />
            </View>
          </GestureDetector>

          <GestureDetector gesture={focusPassword}>
            <View style={styles.button}>
              <Button title="Focus Pwd" />
            </View>
          </GestureDetector>
        </View>
      </GestureHandlerRootView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    fontFamily: 'Aeonik',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 32,
    color: '#001a72',
    fontFamily: 'Aeonik',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ced4da',
    color: '#001a72',
    borderRadius: 8,
    width: '80%',
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '80%',
    marginBottom: 20,
  },
  button: {
    flex: 1,
    marginHorizontal: 10,
  },
  loginButton: {
    marginTop: 20,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#b58df1',
    paddingVertical: 12,
    paddingHorizontal: 48,
    borderRadius: 32,
    marginBottom: 64,
  },
  loginButtonText: {
    fontSize: 18,
    color: '#f8f9ff',
  },
});
