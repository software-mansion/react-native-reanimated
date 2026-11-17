import React from 'react';
import { Button, Modal, StyleSheet, View } from 'react-native';
import Animated, {
  SharedTransition,
  SharedTransitionBoundary,
} from 'react-native-reanimated';

const transition = SharedTransition.duration(1000);

export default function ModalHost() {
  const [visible, setVisible] = React.useState(false);
  const [expanded, setExpanded] = React.useState(false);

  const close = () => {
    setVisible(false);
    setExpanded(false);
  };

  return (
    <View style={styles.container}>
      <Button onPress={() => setVisible(true)} title="open modal" />
      {visible && (
        <Modal transparent animationType="none" onRequestClose={close}>
          <View style={styles.modalContent}>
            <Button
              onPress={() => setExpanded((value) => !value)}
              title="toggle"
            />
            <Button onPress={close} title="close" />
            <SharedTransitionBoundary isActive={!expanded}>
              <View style={styles.thumbnailOffset}>
                <Animated.View
                  sharedTransitionTag="modal-card"
                  sharedTransitionStyle={transition}
                  style={styles.thumbnail}
                />
              </View>
            </SharedTransitionBoundary>
            {expanded && (
              <SharedTransitionBoundary isActive={expanded}>
                <Animated.View
                  sharedTransitionTag="modal-card"
                  sharedTransitionStyle={transition}
                  style={styles.details}
                />
              </SharedTransitionBoundary>
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
    marginTop: 150,
    alignItems: 'center',
  },
  modalContent: {
    flex: 1,
    paddingTop: 60,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  thumbnailOffset: {
    marginTop: 40,
    marginLeft: 40,
  },
  thumbnail: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: 'tomato',
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
});
