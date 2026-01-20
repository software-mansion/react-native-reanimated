'use strict';
import { View } from 'react-native';

export interface SharedTransitionBoundaryProps {
  isActive: boolean;
  children: React.ReactNode;
}

export function SharedTransitionBoundary(props: SharedTransitionBoundaryProps) {
  const { isActive } = props;

  return (
    <View
      nativeID="SharedTransitionBoundary"
      collapsable={false}
      style={{ opacity: isActive ? 1 : 0.99, flex: 1 }}>
      {props.children}
    </View>
  );
}

export default SharedTransitionBoundary;
