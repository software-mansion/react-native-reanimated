import { useIsFocused } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as React from 'react';
import { Button, Modal, StyleSheet, Text, View } from 'react-native';
import Animated, {
  SharedTransition,
  SharedTransitionBoundary,
} from 'react-native-reanimated';

import { withSharedTransitionBoundary } from './withSharedTransitionBoundary';

const PRESENTATIONS = [
  'card',
  'modal',
  'fullScreenModal',
  'formSheet',
  'transparentModal',
] as const;

type Presentation = (typeof PRESENTATIONS)[number];

const RN_MODAL_STYLES = ['fullScreen', 'pageSheet', 'overFullScreen'] as const;

type RNModalStyle = (typeof RN_MODAL_STYLES)[number];

type StackParamList = { Home: undefined } & Record<Presentation, undefined>;

const TAG = 'modal-presentation-box';
const TRANSITION = SharedTransition.duration(1000);

const Stack = createNativeStackNavigator<StackParamList>();

function Home({ navigation }: NativeStackScreenProps<StackParamList, 'Home'>) {
  const isFocused = useIsFocused();
  const [rnModalStyle, setRNModalStyle] = React.useState<RNModalStyle | null>(
    null
  );
  const closeRNModal = () => setRNModalStyle(null);

  return (
    <>
      <SharedTransitionBoundary isActive={isFocused && !rnModalStyle}>
        <View style={styles.home}>
          <Animated.View
            sharedTransitionTag={TAG}
            sharedTransitionStyle={TRANSITION}
            style={styles.source}
          />
          {PRESENTATIONS.map((presentation) => (
            <Button
              key={presentation}
              title={`Open as ${presentation}`}
              onPress={() => navigation.navigate(presentation)}
            />
          ))}
          {RN_MODAL_STYLES.map((modalStyle) => (
            <Button
              key={modalStyle}
              title={`Open RN Modal ${modalStyle}`}
              onPress={() => setRNModalStyle(modalStyle)}
            />
          ))}
        </View>
      </SharedTransitionBoundary>
      <Modal
        visible={!!rnModalStyle}
        animationType="slide"
        presentationStyle={rnModalStyle ?? undefined}
        transparent={rnModalStyle === 'overFullScreen'}
        onRequestClose={closeRNModal}>
        <SharedTransitionBoundary isActive={!!rnModalStyle}>
          <View
            style={[
              styles.details,
              rnModalStyle === 'overFullScreen' && styles.transparent,
            ]}>
            <Text style={styles.title}>RN Modal {rnModalStyle}</Text>
            <Animated.View
              sharedTransitionTag={TAG}
              sharedTransitionStyle={TRANSITION}
              style={styles.target}
            />
            <Button title="Close" onPress={closeRNModal} />
          </View>
        </SharedTransitionBoundary>
      </Modal>
    </>
  );
}

function DetailsContent({
  navigation,
  route,
}: NativeStackScreenProps<StackParamList, Presentation>) {
  return (
    <View
      style={[
        styles.details,
        route.name === 'transparentModal' && styles.transparent,
      ]}>
      <Text style={styles.title}>{route.name}</Text>
      <Animated.View
        sharedTransitionTag={TAG}
        sharedTransitionStyle={TRANSITION}
        style={styles.target}
      />
      <Button title="Close" onPress={() => navigation.goBack()} />
    </View>
  );
}

const Details = withSharedTransitionBoundary(DetailsContent);

export default function ModalPresentationsExample() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Home" component={Home} />
      {PRESENTATIONS.map((presentation) => (
        <Stack.Screen
          key={presentation}
          name={presentation}
          component={Details}
          options={{ presentation }}
        />
      ))}
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  home: { flex: 1, padding: 16 },
  source: {
    width: 80,
    height: 80,
    marginBottom: 24,
    borderRadius: 8,
    backgroundColor: 'crimson',
  },
  details: { flex: 1, padding: 16, backgroundColor: 'white' },
  transparent: { backgroundColor: 'rgba(255, 255, 255, 0.4)' },
  title: { fontSize: 18, marginBottom: 16 },
  target: {
    width: 240,
    height: 240,
    marginTop: 120,
    alignSelf: 'center',
    borderRadius: 24,
    backgroundColor: 'royalblue',
  },
});
