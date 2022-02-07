import React from 'react';
import { View, StyleSheet } from 'react-native';

const Row = ({ style, ...props }) => (
  <View style={[styles.style, style]} {...props} pointerEvents="box-none" />
);

const styles = StyleSheet.create({
  style: {
    height: 64,
  },
});

export default Row;
