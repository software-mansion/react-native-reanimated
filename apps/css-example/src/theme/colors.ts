const baseColors = {
  black: '#000000',
  white: '#FCFCFF',
};

const accentColors = {
  primary: '#5F9CC0',
  primaryDark: '#113E60',
  primaryLight: '#C1E0F1',
};

export const labelColors = {
  Android: '#1B7A41',
  iOS: '#003F8A',
  needsFix: '#D32F2F',
  new: '#008080',
  unimplemented: '#4A4E6A',
  unsupported: '#E65100',
} as const;

export const colors = {
  background1: baseColors.white,
  background2: '#F4F5F7',
  background3: '#E3E6EA',

  foreground1: '#06196D',
  foreground2: '#35427C',
  foreground3: '#626D8A',

  ...baseColors,
  ...accentColors,
  label: labelColors,
} as const;
