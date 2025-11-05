import { useColorMode } from '@docusaurus/theme-common';
import { StyleSheet, TextStyle } from 'react-native';

const useThemedTextStyle = (): TextStyle => {
  const { colorMode } = useColorMode();
  return colorMode === 'light' ? styles.darkText : styles.lightText;
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
