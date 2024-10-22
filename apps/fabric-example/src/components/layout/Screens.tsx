import React from 'react';
import type { ScrollProps } from './Scroll';
import Scroll from './Scroll';

type ScrollScreenProps = Omit<ScrollProps, 'withBottomBarSpacing'>;

export function ScrollScreen(props: ScrollScreenProps) {
  return <Scroll {...props} withBottomBarSpacing />;
}
