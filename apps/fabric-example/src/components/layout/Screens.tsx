import { useHeaderHeight } from '@react-navigation/elements';
import type { PropsWithChildren } from 'react';
import React from 'react';
import type { ViewStyle } from 'react-native';
import { Dimensions, View } from 'react-native';

import type { ScrollProps } from './Scroll';
import Scroll from './Scroll';

type ScreenProps = PropsWithChildren<{
  style?: ViewStyle;
}>;

export function Screen({ children, style }: ScreenProps) {
  const windowHeight = Dimensions.get('window').height;
  const headerHeight = useHeaderHeight();

  return (
    <View style={[{ height: windowHeight - headerHeight }, style]}>
      {children}
    </View>
  );
}

type ScrollScreenProps = Omit<ScrollProps, 'withBottomBarSpacing'>;

export function ScrollScreen(props: ScrollScreenProps) {
  return (
    <Screen>
      <Scroll {...props} withBottomBarSpacing />
    </Screen>
  );
}
