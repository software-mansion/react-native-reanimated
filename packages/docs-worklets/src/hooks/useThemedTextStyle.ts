import { useColorScheme } from '@mui/material';
import { StyleSheet, TextStyle } from 'react-native';

const useThemedTextStyle = (): TextStyle => {
  const { colorScheme } = useColorScheme();
  return colorScheme === 'light' ? styles.darkText : styles.lightText;
};

export default useThemedTextStyle;

const styles = StyleSheet.create({
  lightText: {
    color: 'var(--swm-off-white)',
  },
  darkText: {
    color: 'var(--swm-navy-light-100)',
  },
});
