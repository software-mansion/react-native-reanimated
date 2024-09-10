const baseColors = {
  black: '#000000',
  white: '#fcfcff',
};

const accentColors = {
  primary: '#357ABD',
  primaryDark: '#1A4E91',
  primaryLight: '#A9D8FF',
  secondary: '#0B1465',
  secondaryLight: '#DFF0F9',
};

export const colors = {
  background1: '#fcfcff',
  background2: '#D8E6F5',
  background3: '#C2D2E8',

  foreground1: '#0B1465',
  foreground2: '#1E3A8A',
  foreground3: '#4A6B9E',

  ...baseColors,
  ...accentColors,
} as const;
