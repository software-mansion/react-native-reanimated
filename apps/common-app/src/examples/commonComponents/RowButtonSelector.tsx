import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const NAVY = '#001A72';

export function SelectorRow({
  firstButtonLabel,
  secondButtonLabel,
  selectedFirstButton,
  setSelectedFirstButton,
}: {
  firstButtonLabel: string;
  secondButtonLabel: string;
  selectedFirstButton: boolean;
  setSelectedFirstButton: (selectedFirstButton: boolean) => void;
}) {
  return (
    <View style={styles.buttonRow}>
      <TouchableOpacity
        style={
          selectedFirstButton ? styles.selectedButton : styles.notSelectedButton
        }
        onPress={() => setSelectedFirstButton(true)}>
        <Text
          style={
            selectedFirstButton
              ? styles.selectedButtonText
              : styles.notSelectedButtonText
          }>
          {firstButtonLabel}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={
          !selectedFirstButton
            ? styles.selectedButton
            : styles.notSelectedButton
        }
        onPress={() => setSelectedFirstButton(false)}>
        <Text
          style={
            !selectedFirstButton
              ? styles.selectedButtonText
              : styles.notSelectedButtonText
          }>
          {secondButtonLabel}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  buttonRow: {
    flexDirection: 'row',
    height: 40,
    width: '80%',
    margin: 20,
    marginBottom: 0,
    borderWidth: 2,
    borderColor: NAVY,
  },
  selectedButton: {
    backgroundColor: NAVY,
    width: '50%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  notSelectedButton: {
    backgroundColor: 'white',
    width: '50%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedButtonText: {
    color: 'white',
    fontSize: 20,
  },
  notSelectedButtonText: {
    color: NAVY,
    fontSize: 20,
  },
});
