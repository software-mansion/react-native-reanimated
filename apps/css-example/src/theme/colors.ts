const baseColors = {
  black: '#000000',
  white: '#FCFCFF',
};

const accentColors = {
  primary: '#5F9CC0',
  primaryDark: '#113E60',
  primaryLight: '#C1E0F1',
};

export const colors = {
  background1: baseColors.white,
  background2: '#F4F5F7',
  background3: '#E3E6EA',

  foreground1: '#06196D',
  foreground2: '#35427C',
  foreground3: '#626D8A',

  ...baseColors,
  ...accentColors,
} as const;
