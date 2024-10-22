import { useIsFocused } from '@react-navigation/native';
import type { CSSAnimationPlayState } from 'react-native-reanimated';

// TODO - remove this temporary hook once the native animation pausing
// on screen change is implemented
export function useFocusPlayState(): CSSAnimationPlayState {
  return useIsFocused() ? 'running' : 'paused';
}
