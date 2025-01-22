import { flex } from '@/theme';
import { createContext } from 'react';
import { Dimensions, SafeAreaView, View } from 'react-native';

const edgeInsets = {
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
};

export function useSafeAreaInsets() {
  return edgeInsets;
}

export function useSafeAreaFrame() {
  return {
    x: 0,
    y: 0,
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
  };
}

export function SafeAreaProvider({ children }: { children: React.ReactNode }) {
  return <View style={flex.fill}>{children}</View>;
}

export const SafeAreaInsetsContext = createContext(edgeInsets);

export { SafeAreaView };
