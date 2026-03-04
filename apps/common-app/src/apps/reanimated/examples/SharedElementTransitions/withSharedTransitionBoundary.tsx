'use strict';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import React, { memo, useEffect, useLayoutEffect } from 'react';
import { SharedTransitionBoundary } from 'react-native-reanimated';

import { useSharedTransitionContext } from './SharedTransitionContext';

function useSETFocused() {
  const context = useSharedTransitionContext();
  const focused = useIsFocused();

  // When gaining focus, notify siblings. Cleanup handles unmount-while-focused.
  useLayoutEffect(() => {
    if (focused) {
      context.notify();
    }
  }, [focused]);

  return focused;
}

export function withSharedTransitionBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>
) {
  const MemoizedContent = memo(WrappedComponent);

  return function WithSharedTransitionBoundary(props: P) {
    const isFocused = useSETFocused();
    return (
      <SharedTransitionBoundary isActive={isFocused}>
        <MemoizedContent {...props} />
      </SharedTransitionBoundary>
    );
  };
}
