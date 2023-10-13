'use strict';
import type { AnimatedRef } from '../hook/commonTypes';
import type { Component } from 'react';
import type { ScrollView } from 'react-native';

export const scrollTo: <T extends Component>(
  animatedRef: AnimatedRef<T>,
  x: number,
  y: number,
  animated: boolean
) => void = (animatedRef, x, y, animated) => {
  const element = animatedRef();

  // This prevents crashes if ref has not been set yet
  if (element !== -1) {
    // By ScrollView we mean any scrollable component
    (element as ScrollView)?.scrollTo({ x, y, animated });
  }
};
