import Animated, {
  KeyboardState,
  runOnUI,
  useAnimatedKeyboard,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
} from 'react-native-reanimated';
import {
  FlatList, Modal,
  Pressable,
  ScrollView,
  ScrollViewProps,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import React, { useCallback, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TouchableOpacity } from 'react-native-gesture-handler';

function ListItem({ title, onLongPress }: {
  title: string,
  onLongPress: () => void,
}) {
  return (
    <TouchableOpacity onLongPress={onLongPress}>
      <View style={styles.item}>
        <Text>Open keyboard and long press on message number {title}</Text>
      </View>
    </TouchableOpacity>
  );
}

function KeyboardSpace({ modalVisible, children, ...props }: ScrollViewProps & {
  modalVisible: Animated.SharedValue<boolean>,
  children: React.ReactNode,
}) {
    const keyboard = useAnimatedKeyboard();

    const [ctx] = useState({
      lastHeight: 0,
      keyboardWasOpen: false,
    });

    const translateY = useDerivedValue(() => {
      const { height, state } = keyboard;
      console.log('height', height.value, 'ctx.lastHeight', ctx.lastHeight, 'state.value', state.value, 'modalVisible.value', modalVisible.value);

      if (state.value === KeyboardState.OPEN && !modalVisible.value) {
        ctx.lastHeight = height.value;
      }

      if (state.value === KeyboardState.CLOSING) {
        ctx.lastHeight = 0;
      }

      if (modalVisible.value || state.value === KeyboardState.CLOSED) {

        return ctx.lastHeight - 17;
      }

      return 0;
    });

    const animatedStyle = useAnimatedStyle(() => {
      return {
        transform: [
          {
            translateY: translateY.value,
          },
        ],
      };
    });

    return (
      <ScrollView {...props}>
        <Animated.View style={[{flex: 1}, animatedStyle]}>
          {children}
        </Animated.View>
      </ScrollView>
    )
}

export default function KeyboardAvoidingViewExample(): React.ReactElement {
  const insets = useSafeAreaInsets();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const modalVisible = useSharedValue(false);

  const showModal = useCallback(() => {
    runOnUI(() => {
      "worklet";

      modalVisible.value = true;
    })();

    setIsModalVisible(true);
  }, []);

  const hideModal = useCallback(() => {
    runOnUI(() => {
      "worklet";

      modalVisible.value = false;
    })();

    setIsModalVisible(false);
  }, []);



  const renderScrollComponent = useCallback(
    (props: ScrollViewProps) => {
      return <KeyboardSpace {...props} modalVisible={modalVisible} />;
    },
    [modalVisible]
  );

  return (
    <View style={[styles.container]}>
      <FlatList
        inverted
        renderScrollComponent={renderScrollComponent}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="always"
        data={Array.from({ length: 20 }).map((_, i) => i)}
        renderItem={({ item }) => (
          <ListItem onLongPress={showModal} title={`Item ${item}`} />
        )}
      />

      <Animated.KeyboardAvoidingView
        behavior="padding"
        keyboardVerticalOffset={40 + insets.bottom}>
        <View
          style={{
            paddingBottom: insets.bottom,
          }}>
          <TextInput
            placeholder="Message here..."
            style={[styles.textInput]}
            autoCorrect
          />
        </View>
      </Animated.KeyboardAvoidingView>

      <Modal
        style={styles.sheetContainer}
        visible={isModalVisible}
        transparent
        animationType="none">
        <Pressable style={styles.sheetBackdrop} onPress={hideModal}></Pressable>

        <View style={styles.sheet}>
          <Text style={styles.sheetText}>
            This modal should cover the keyboard, but the latest message should
            be in the same place.
          </Text>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  item: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderTopWidth: 1,
    marginHorizontal: 20,
    borderColor: 'rgba(29, 28, 29, 0.13)',
  },
  textInput: {
    borderColor: 'rgba(29, 28, 29, 0.13)',
    borderStyle: 'solid',
    borderWidth: 1,
    height: 48,
    borderRadius: 20,
    marginHorizontal: 20,
    paddingHorizontal: 20,
  },
  sheetContainer: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  sheet: {
    borderColor: 'rgba(29, 28, 29, 0.13)',
    borderWidth: 1,
    backgroundColor: 'white',
    height: 300,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  sheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  sheetText: {
    fontSize: 20,
  },
});
