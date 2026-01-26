'use strict';
import { View } from 'react-native';

import { RNReanimatedSharedTransitionBoundary } from '../specs';

export interface SharedTransitionBoundaryProps {
  isActive: boolean;
  children: React.ReactNode;
}

export function SharedTransitionBoundary(props: SharedTransitionBoundaryProps) {
  const { isActive } = props;

  return (
    <RNReanimatedSharedTransitionBoundary isActive={isActive}>
      <View style={{ flex: 1 }}>{props.children}</View>
    </RNReanimatedSharedTransitionBoundary>
  );
}

export default SharedTransitionBoundary;
