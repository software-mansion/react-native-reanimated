'use strict';
import { StyleSheet } from 'react-native';

import RNReanimatedSharedTransitionBoundary from '../specs/SharedTransitionBoundaryProvider';

export interface SharedTransitionBoundaryProps {
  isActive: boolean;
  children?: React.ReactNode;
}

export function SharedTransitionBoundary({
  isActive,
  children,
}: SharedTransitionBoundaryProps) {
  return (
    <RNReanimatedSharedTransitionBoundary
      style={styles.contents}
      isActive={isActive}>
      {children}
    </RNReanimatedSharedTransitionBoundary>
  );
}

const styles = StyleSheet.create({
  contents: {
    overflow: 'visible',
    display: 'contents',
  },
});
