import { useNavigation } from '@react-navigation/native';
import React, { useLayoutEffect } from 'react';
import {
  Image,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, SvgXml } from 'react-native-svg';

import { REANIMATED_LOGO } from './reanimatedLogo';
import { colors, fonts, shadow, text } from './theme';
import { useHiddenAppHeader } from './ui';

// React Native core decodes animated GIFs, so the clip loops without a video library.
const CAKES_CLIP = require('../assets/cake-shop/cakes.gif');

const LOGO_WIDTH = 168;
const SIDE_MARGIN = 20;

export default function OrderDelivered() {
  useHiddenAppHeader();
  useDarkStatusBar();
  const insets = useSafeAreaInsets();
  const clipWidth = useWindowDimensions().width - 2 * SIDE_MARGIN;

  return (
    <View
      style={[
        styles.screen,
        { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 20 },
      ]}>
      <View style={styles.clipCard}>
        <Image
          source={CAKES_CLIP}
          style={[
            styles.clip,
            { width: clipWidth, height: (clipWidth * 9) / 16 },
          ]}
        />
      </View>
      <View style={styles.message}>
        <View style={styles.badge}>
          <CheckMark />
        </View>
        <Text style={[text.display, styles.title]}>Order delivered</Text>
        <Text style={styles.subtitle}>Thank you for baking with us!</Text>
      </View>
      <SvgXml
        xml={REANIMATED_LOGO.xml}
        width={LOGO_WIDTH}
        height={(LOGO_WIDTH * REANIMATED_LOGO.height) / REANIMATED_LOGO.width}
        style={styles.logo}
      />
    </View>
  );
}

function useDarkStatusBar() {
  const navigation = useNavigation();
  useLayoutEffect(() => {
    navigation.setOptions({ statusBarStyle: 'dark' });
  }, [navigation]);
}

function CheckMark() {
  return (
    <Svg width={30} height={30} viewBox="0 0 24 24">
      <Path
        d="M5 12.5l4.5 4.5L19 7.5"
        stroke={colors.navy}
        strokeWidth={2.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.cream,
    paddingHorizontal: SIDE_MARGIN,
  },
  clipCard: {
    borderRadius: 28,
    backgroundColor: colors.white,
    ...shadow,
  },
  clip: {
    borderRadius: 28,
  },
  message: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.yellow,
    marginBottom: 24,
  },
  title: {
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 10,
    fontFamily: fonts.regular,
    fontSize: 18,
    lineHeight: 24,
    color: colors.navySoft,
    textAlign: 'center',
  },
  logo: {
    alignSelf: 'center',
  },
});
