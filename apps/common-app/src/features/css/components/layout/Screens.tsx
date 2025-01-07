import { useHeaderHeight } from '@react-navigation/elements';
import type { PropsWithChildren } from 'react';
import React from 'react';
import type { ViewStyle } from 'react-native';
import { Dimensions, Platform, View } from 'react-native';

import type { ScrollProps } from './Scroll';
import Scroll from './Scroll';

type ScreenProps = PropsWithChildren<{
  style?: ViewStyle;
}>;

export function Screen({ children, style }: ScreenProps) {
  const screenHeight = Dimensions.get('screen').height;
  const headerHeight = useHeaderHeight();

  const defaultStyle = Platform.select({
    default: {
      height: screenHeight - headerHeight,
    },
    web: {
      flex: 1,
    },
  });

  return <View style={[defaultStyle, style]}>{children}</View>;
}

type ScrollScreenProps = Omit<ScrollProps, 'withBottomBarSpacing'>;

export function ScrollScreen(props: ScrollScreenProps) {
  return (
    <Screen>
      <Scroll {...props} withBottomBarSpacing />
    </Screen>
  );
}
