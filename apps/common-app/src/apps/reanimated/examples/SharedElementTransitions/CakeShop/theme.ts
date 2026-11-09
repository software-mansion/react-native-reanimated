import { StyleSheet } from 'react-native';

export const colors = {
  navy: '#001a72',
  navySoft: '#6d74ba',
  ink: '#0d0f26',
  cream: '#fff8ea',
  paradise: '#fff4c0',
  white: '#ffffff',
  pink: '#e963a6',
  pinkSoft: '#f4afd1',
  yellow: '#f7c94a',
  yellowSoft: '#fdd977',
  aqua: '#9cdede',
  peri: '#b5bff2',
  purple: '#d9b9e9',
  red: '#faaca8',
  orange: '#f9bf86',
  green: '#a0d99b',
  blue: '#9bd2ed',
};

export const fonts = {
  regular: 'Aeonik-Regular',
  medium: 'Aeonik-Medium',
  bold: 'Aeonik-Bold',
};

export const text = StyleSheet.create({
  display: {
    fontFamily: fonts.bold,
    fontSize: 34,
    letterSpacing: -0.8,
    color: colors.navy,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 22,
    letterSpacing: -0.4,
    color: colors.navy,
  },
  name: {
    fontFamily: fonts.medium,
    fontSize: 17,
    color: colors.navy,
  },
  body: {
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 22,
    color: colors.navySoft,
  },
  caption: {
    fontFamily: fonts.medium,
    fontSize: 12,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: colors.navySoft,
  },
  price: {
    fontFamily: fonts.bold,
    fontSize: 17,
    color: colors.navy,
  },
});

export const shadow = {
  shadowColor: colors.navy,
  shadowOpacity: 0.12,
  shadowRadius: 18,
  shadowOffset: { width: 0, height: 8 },
};
