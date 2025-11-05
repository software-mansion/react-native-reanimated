import Animated, {
  dispatchCommand,
  useAnimatedRef,
} from 'react-native-reanimated';
import {
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
  const tosRef = useAnimatedRef();
  const loginRef = useAnimatedRef();

  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');

  const goDown = Gesture.Tap().onStart(() => {
    dispatchCommand(tosRef, 'scrollToEnd', [true]);
    dispatchCommand(loginRef, 'focus');
  });

  const handleLogin = () => {
    Alert.alert(`Welcome ${login}`, 'Successfully logged in!');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <GestureHandlerRootView style={styles.container}>
        <Animated.ScrollView
          stickyHeaderIndices={[1]}
          ref={tosRef}
          contentContainerStyle={styles.tosContainer}>
          <View style={styles.background} />
          <View style={styles.stickyButtonContainer}>
            <GestureDetector gesture={goDown}>
              <Pressable style={styles.button}>
                <Text style={styles.buttonText}>I'm tired of reading.</Text>
              </Pressable>
            </GestureDetector>
          </View>
          <Text style={styles.tosTitle}>Terms of Service</Text>
          <Text style={styles.tosContent}>
            Welcome to Services! These Terms of Service ("Terms") govern your
            use of our website, products, and services ("Services"). By
            accessing or using our Services, you agree to be bound by these
            Terms. If you do not agree to these Terms, do not use our Services.
          </Text>
          <Text style={styles.tosSubtitle}>1. Acceptance of Terms</Text>
          <Text style={styles.tosContent}>
            By using our Services, you affirm that you are at least 18 years
            old, or if you are under 18 years old, that you have the consent of
            your parent or legal guardian.
          </Text>
          <Text style={styles.tosSubtitle}>2. Changes to Terms</Text>
          <Text style={styles.tosContent}>
            We reserve the right to modify these Terms at any time. We will
            notify you of any changes by posting the new Terms on our website.
            You are advised to review these Terms periodically for any changes.
            Your continued use of the Services after the changes are posted
            constitutes your acceptance of the new Terms.
          </Text>
          <Text style={styles.tosSubtitle}>3. Use of Services</Text>
          <Text style={styles.tosContent}>
            You agree to use the Services only for lawful purposes and in
            accordance with these Terms. You agree not to use the Services:
            {'\n'}• In any way that violates any applicable federal, state,
            local, or international law or regulation.
            {'\n'}• For the purpose of exploiting, harming, or attempting to
            exploit or harm minors in any way.
            {'\n'}• To transmit, or procure the sending of, any advertising or
            promotional material, including any "junk mail," "chain letters,"
            "spam," or any other similar solicitation.
            {'\n'}• To impersonate or attempt to impersonate Services, a
            Services employee, another user, or any other person or entity.
            {'\n'}• In any way that infringes upon the rights of others, or in
            any way is illegal, threatening, fraudulent, or harmful, or in
            connection with any unlawful, illegal, fraudulent, or harmful
            purpose or activity.
            {'\n'}• To engage in any other conduct that restricts or inhibits
            anyone's use or enjoyment of the Services, or which, as determined
            by us, may harm Services or users of the Services, or expose them to
            liability.
          </Text>
          <Text style={styles.tosSubtitle}>4. User Accounts</Text>
          <Text style={styles.tosContent}>
            To access some of the Services, you may be required to create an
            account. You agree to provide accurate, current, and complete
            information during the registration process and to update such
            information to keep it accurate, current, and complete. You are
            responsible for safeguarding your password and agree not to disclose
            your password to any third party. You agree that you are solely
            responsible for any activities or actions under your account,
            whether you have authorized such activities or actions. You will
            immediately notify us of any unauthorized use of your account.
          </Text>
          <Text style={styles.tosSubtitle}>5. Termination</Text>
          <Text style={styles.tosContent}>
            We may terminate or suspend your access to the Services immediately,
            without prior notice or liability, for any reason whatsoever,
            including without limitation if you breach the Terms. Upon
            termination, your right to use the Services will immediately cease.
            If you wish to terminate your account, you may simply discontinue
            using the Services.
          </Text>
          <Text style={styles.tosSubtitle}>6. Limitation of Liability</Text>
          <Text style={styles.tosContent}>
            In no event shall Services, nor its directors, employees, partners,
            agents, suppliers, or affiliates, be liable for any indirect,
            incidental, special, consequential, or punitive damages, including
            without limitation, loss of profits, data, use, goodwill, or other
            intangible losses, resulting from (i) your use or inability to use
            the Service; (ii) any unauthorized access to or use of our servers
            and/or any personal information stored therein; (iii) any
            interruption or cessation of transmission to or from the Service;
            (iv) any bugs, viruses, trojan horses, or the like that may be
            transmitted to or through our Service by any third party; (v) any
            errors or omissions in any content or for any loss or damage
            incurred as a result of your use of any content posted, emailed,
            transmitted, or otherwise made available through the Service; and/or
            (vi) the defamatory, offensive, or illegal conduct of any third
            party. In no event shall Services be liable for any claims,
            proceedings, liabilities, obligations, damages, losses, or costs in
            an amount exceeding the amount you paid to Services hereunder or
            $100.00, whichever is greater.
          </Text>
          <Text style={styles.tosSubtitle}>7. Governing Law</Text>
          <Text style={styles.tosContent}>
            These Terms shall be governed and construed in accordance with the
            laws of Poland, without regard to its conflict of law provisions.
            Our failure to enforce any right or provision of these Terms will
            not be considered a waiver of those rights. If any provision of
            these Terms is held to be invalid or unenforceable by a court, the
            remaining provisions of these Terms will remain in effect. These
            Terms constitute the entire agreement between us regarding our
            Service, and supersede and replace any prior agreements we might
            have had between us regarding the Service.
          </Text>
          <View style={styles.loginForm}>
            <Text style={styles.loginFormTitle}>Welcome!</Text>
            <Text style={styles.loginFormSubtitle}>
              By logging in you accept our Terms of Service.
            </Text>
            <AnimatedTextInput
              ref={loginRef}
              style={styles.input}
              placeholder="Login"
              value={login}
              onChangeText={setLogin}
            />
            <AnimatedTextInput
              style={styles.input}
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
            <Pressable style={styles.button} onPress={handleLogin}>
              <Text style={styles.buttonText}>Login</Text>
            </Pressable>
          </View>
        </Animated.ScrollView>
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
  },
  tosContainer: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  background: {
    width: '10%',
  },
  tosTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginVertical: 16,
    color: '#001a72',
  },
  tosSubtitle: {
    fontSize: 18,
    fontWeight: '600',
    marginVertical: 16,
    color: '#001a72',
  },
  tosContent: {
    fontFamily: 'Aeonik',
    fontSize: 16,
    marginBottom: 8,
    color: '#001a72',
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
  stickyButtonContainer: {
    backgroundColor: '#f8f9ff',
    paddingVertical: 16,
    paddingHorizontal: 48,
    width: '100%',
  },
  button: {
    backgroundColor: '#b58df1',
    marginVertical: 16,
    paddingVertical: 12,
    paddingHorizontal: 48,
    borderRadius: 32,
  },
  buttonText: {
    fontSize: 18,
    color: '#f8f9ff',
    textAlign: 'center',
  },
  loginForm: {
    marginVertical: 32,
    width: '100%',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginFormTitle: {
    fontSize: 22,
    fontFamily: 'Aeonik',
    color: '#001a72',
    fontWeight: '600',
    marginBottom: 8,
  },
  loginFormSubtitle: {
    fontFamily: 'Aeonik',
    color: '#001a7299',
    marginBottom: 16,
  },
});
