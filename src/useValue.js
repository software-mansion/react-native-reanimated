import React from 'react';
import AnimatedValue from './core/AnimatedValue';

export default function useValue(initialValue) {
  return React.useRef(new AnimatedValue(initialValue)).current;
}
