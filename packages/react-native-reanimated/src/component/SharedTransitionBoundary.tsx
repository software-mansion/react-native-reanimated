'use strict';
import { StyleSheet } from 'react-native';

import { RNReanimatedSharedTransitionBoundary } from '../specs';

export type SharedTransitionBoundaryProps = React.PropsWithChildren<{
  isActive: boolean;
}>;

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
    overflow: 'visible',
    display: 'contents',
  },
});

export default SharedTransitionBoundary;
