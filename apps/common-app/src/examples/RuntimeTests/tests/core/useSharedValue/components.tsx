import React from 'react';
import { View } from 'react-native';

export enum MutableAPI {
  ORIGINAL = 'ORIGINAL',
  REACT_COMPATIBLE = 'REACT_COMPATIBLE',
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
