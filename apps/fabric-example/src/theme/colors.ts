const baseColors = {
  black: '#000000',
  white: '#fcfcff',
};

const accentColors = {
  primary: '#9353E0',
  primaryDark: '#5A1BB8',
  primaryLight: '#E9D6FE',
  secondary: '#0B1465',
  secondaryLight: '#DFF0F9',
};

export const colors = {
  background1: '#F8F6FF',
  background2: '#EEEAF5',
  background3: '#E1DEE8',

  foreground1: '#0B1465',
  foreground2: '#111866',
  foreground3: '#626CA0',

  ...baseColors,
  ...accentColors,
} as const;
