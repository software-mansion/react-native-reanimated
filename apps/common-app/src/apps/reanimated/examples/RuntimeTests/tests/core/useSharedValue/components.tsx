import React from 'react';
import { StyleSheet, View } from 'react-native';

export enum MutableAPI {
  ORIGINAL = 'ORIGINAL',
  REACT_COMPATIBLE = 'REACT_COMPATIBLE',
  REACT_COMPATIBLE_WITH_FUNCTION = 'REACT_COMPATIBLE_WITH_FUNCTION',
}

export const ProgressBar = ({ progress }: { progress: number }) => {
  return (
    <View style={styles.container}>
      <View style={[styles.progressBar, { width: `${100 * progress}%` }]} />
    </View>
  );
};

export const styles = StyleSheet.create({
  container: {
    margin: 30,
    borderWidth: 3,
    borderColor: 'darkorange',
  },
  progressBar: {
    height: 80,
    backgroundColor: 'darkorange',
  },
});
