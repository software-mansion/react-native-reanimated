import { createNavigationContainerRef } from '@react-navigation/native';
import type { NavigationRouteName } from './routes';

type RootStackParamList = Record<NavigationRouteName, undefined>;

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

export function navigate(route: NavigationRouteName) {
  if (navigationRef.isReady()) {
    navigationRef.navigate(route);
  }
}
