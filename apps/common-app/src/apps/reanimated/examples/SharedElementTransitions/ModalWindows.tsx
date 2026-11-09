import React from 'react';
import { Button, Modal, StyleSheet, View } from 'react-native';
import Animated, {
  SharedTransition,
  SharedTransitionBoundary,
} from 'react-native-reanimated';

const transition = SharedTransition.duration(1000);

type Step = 'screen' | 'modal' | 'secondModal';

export default function ModalWindows() {
  const [step, setStep] = React.useState<Step>('screen');

  return (
    <View style={styles.container}>
      <Button onPress={() => setStep('modal')} title="open modal" />
      <SharedTransitionBoundary isActive={step === 'screen'}>
        <Animated.View
          sharedTransitionTag="window-card"
          sharedTransitionStyle={transition}
          style={styles.thumbnail}
        />
      </SharedTransitionBoundary>
      {step !== 'screen' && (
        <Modal
          transparent
          animationType="none"
          onRequestClose={() => setStep('screen')}>
          <View style={styles.modalContent}>
            <Button onPress={() => setStep('screen')} title="close" />
            <Button
              onPress={() =>
                setStep(step === 'modal' ? 'secondModal' : 'modal')
              }
              title="second modal"
            />
            <SharedTransitionBoundary isActive={step === 'modal'}>
              <Animated.View
                sharedTransitionTag="window-card"
                sharedTransitionStyle={transition}
                style={styles.details}
              />
            </SharedTransitionBoundary>
            {step === 'secondModal' && (
              <Modal
                transparent
                animationType="none"
                onRequestClose={() => setStep('modal')}>
                <View style={styles.secondModalContent}>
                  <Button onPress={() => setStep('modal')} title="back" />
                  <SharedTransitionBoundary isActive>
                    <Animated.View
                      sharedTransitionTag="window-card"
                      sharedTransitionStyle={transition}
                      style={styles.secondDetails}
                    />
                  </SharedTransitionBoundary>
                </View>
              </Modal>
            )}
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 120,
    paddingHorizontal: 20,
  },
  thumbnail: {
    marginTop: 40,
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: 'tomato',
  },
  modalContent: {
    flex: 1,
    paddingTop: 60,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  details: {
    position: 'absolute',
    top: 360,
    left: 20,
    right: 20,
    height: 240,
    borderRadius: 24,
    backgroundColor: 'royalblue',
  },
  secondModalContent: {
    flex: 1,
    paddingTop: 200,
    backgroundColor: 'rgba(40, 0, 60, 0.3)',
  },
  secondDetails: {
    position: 'absolute',
    bottom: 80,
    right: 30,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'seagreen',
  },
});
