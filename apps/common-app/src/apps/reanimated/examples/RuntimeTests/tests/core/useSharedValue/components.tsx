import React from 'react';
import { View } from 'react-native';

export enum MutableAPI {
  ORIGINAL = 'ORIGINAL',
  REACT_COMPATIBLE = 'REACT_COMPATIBLE',
  REACT_COMPATIBLE_WITH_FUNCTION = 'REACT_COMPATIBLE_WITH_FUNCTION',
}

export const ProgressBar = ({ progress }: { progress: number }) => {
  return (
    <View style={{ margin: 30, borderWidth: 3, borderColor: 'darkorange' }}>
      <View
        style={{
          height: 80,
          width: `${100 * progress}%`,
          backgroundColor: 'darkorange',
        }}
      />
    </View>
  );
};
