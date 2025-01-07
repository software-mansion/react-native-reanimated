import { PortalProvider } from '@gorhom/portal';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { NavigationState } from '@react-navigation/native';
import {
  getPathFromState,
  NavigationContainer,
} from '@react-navigation/native';
import { useCallback, useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { flex } from '@/theme';
import { IS_WEB, noop } from '@/utils';

import { Navigator } from './navigation';

const PERSISTENCE_KEY = 'NAVIGATION_STATE';

export default function App() {
  const [isReady, setIsReady] = useState(false);
  const [navigationState, setNavigationState] = useState<NavigationState>();

  useEffect(() => {
    if (IS_WEB) {
      return;
    }

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
    <SafeAreaProvider>
      <GestureHandlerRootView style={flex.fill}>
        <NavigationContainer
          initialState={navigationState}
          linking={{
            getPathFromState: (state, options) =>
              getPathFromState(state, options).replace(/%2F/g, '/'),
            getStateFromPath: (path) => {
              const chunks = path.split('/').filter(Boolean);
              const routes = chunks.reduce<Array<{ name: string }>>(
                (result, chunk) => {
                  const lastRoute = result[result.length - 1];
                  const route = {
                    name: lastRoute ? `${lastRoute.name}/${chunk}` : chunk,
                  };
                  result.push(route);
                  return result;
                },
                []
              );
              return { routes };
            },
            prefixes: [],
          }}
          onStateChange={persistNavigationState}>
          <PortalProvider>
            <Navigator />
          </PortalProvider>
        </NavigationContainer>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}
