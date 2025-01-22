import { flex } from '@/theme';
import { SafeAreaView, View } from 'react-native';

function useSafeAreaInsets() {
  return {
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  };
}

function SafeAreaProvider({ children }: { children: React.ReactNode }) {
  return <View style={flex.fill}>{children}</View>;
}

export { SafeAreaView, SafeAreaProvider, useSafeAreaInsets };
