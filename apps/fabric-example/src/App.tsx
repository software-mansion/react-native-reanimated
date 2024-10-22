import AsyncStorage from '@react-native-async-storage/async-storage';
import type { NavigationState } from '@react-navigation/native';
import { NavigationContainer } from '@react-navigation/native';
import { useCallback, useEffect, useState } from 'react';
import { PortalProvider } from '@gorhom/portal';

import { noop } from './utils';
import { Navigator } from './navigation';
import { SafeAreaProvider } from 'react-native-safe-area-context';

const PERSISTENCE_KEY = 'NAVIGATION_STATE';

export default function App() {
  const [isReady, setIsReady] = useState(false);
  const [navigationState, setNavigationState] = useState<NavigationState>();

  useEffect(() => {
    const restoreState = async () => {
      try {
        const savedStateString = await AsyncStorage.getItem(PERSISTENCE_KEY);
        const state = savedStateString
          ? (JSON.parse(savedStateString) as NavigationState)
          : undefined;

        if (state !== undefined) {
          setNavigationState(state);
        }
      } finally {
        setIsReady(true);
      }
    };

    if (!isReady) {
      restoreState().catch(noop);
    }
  }, [isReady]);

  const persistNavigationState = useCallback((state?: NavigationState) => {
    AsyncStorage.setItem(PERSISTENCE_KEY, JSON.stringify(state)).catch(noop);
  }, []);

  return (
    <PortalProvider>
      <SafeAreaProvider>
        <NavigationContainer
          initialState={navigationState}
          onStateChange={persistNavigationState}>
          <Navigator />
        </NavigationContainer>
      </SafeAreaProvider>
    </PortalProvider>
  );
}
