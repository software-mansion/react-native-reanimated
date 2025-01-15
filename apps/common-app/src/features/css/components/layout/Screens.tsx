import type { PropsWithChildren } from 'react';
import React from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { View } from 'react-native';

import { flex } from '@/theme';

import type { ScrollProps } from './Scroll';
import Scroll from './Scroll';

type ScreenProps = PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
}>;

export function Screen({ children, style }: ScreenProps) {
  return <View style={[flex.fill, style]}>{children}</View>;
}

type ScrollScreenProps = Omit<ScrollProps, 'withBottomBarSpacing'>;

export function ScrollScreen(props: ScrollScreenProps) {
  return (
    <Screen>
      <Scroll {...props} withBottomBarSpacing />
    </Screen>
  );
}
