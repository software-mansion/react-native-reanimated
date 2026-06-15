'use strict';
import { StyleSheet } from 'react-native';

import REASharedTransitionBoundary from '../specs/SharedTransitionBoundaryProvider';

export interface SharedTransitionBoundaryProps {
  isActive: boolean;
  children?: React.ReactNode;
}

export function SharedTransitionBoundary({
  isActive,
  children,
}: SharedTransitionBoundaryProps) {
  return (
    <REASharedTransitionBoundary style={styles.contents} isActive={isActive}>
      {children}
    </REASharedTransitionBoundary>
  );
}

// is-tree-shakable-suppress
const styles = StyleSheet.create({
  contents: {
    overflow: 'visible',
    display: 'contents',
  },
});
