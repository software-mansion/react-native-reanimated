'use strict';
import { View, StyleSheet } from 'react-native';
import { RNReanimatedSharedTransitionBoundary } from '../specs';

export interface SharedTransitionBoundaryProps {
  isActive: boolean;
  children: React.ReactNode;
}

export function SharedTransitionBoundary(props: SharedTransitionBoundaryProps) {
  const { isActive, children } = props;

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
    display: 'contents',
  },
});

export default SharedTransitionBoundary;
