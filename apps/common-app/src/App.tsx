import { PortalProvider } from '@gorhom/portal';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createDrawerNavigator } from '@react-navigation/drawer';
import type { NavigationState } from '@react-navigation/native';
import {
  getPathFromState,
  NavigationContainer,
} from '@react-navigation/native';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Platform, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { colors, flex, radius, text } from '@/theme';
import { IS_MACOS, IS_WEB, isFabric, noop } from '@/utils';

import { CSSApp, ReanimatedApp } from './apps';

export default function App() {
  const { isReady, navigationState, updateNavigationState } =
    useNavigationState();

  if (!isReady) {
    return (
      <View style={[flex.fill, flex.center]}>
        <ActivityIndicator />
      </View>
    );
  }

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
          onStateChange={updateNavigationState}>
          <PortalProvider>
            <Navigator />
          </PortalProvider>
        </NavigationContainer>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}

const SCREENS = [
  {
    component: CSSApp,
    name: 'CSS',
  },
  {
    component: ReanimatedApp,
    name: 'Reanimated',
  },
];

function Navigator() {
  if (IS_MACOS) {
    return <ReanimatedApp />;
  }

  const Drawer = createDrawerNavigator();
  const screens = isFabric() || IS_WEB ? SCREENS : SCREENS.reverse();

  return (
    <Drawer.Navigator
      screenOptions={{
        drawerActiveBackgroundColor: colors.primaryLight,
        drawerActiveTintColor: colors.primaryDark,
        drawerInactiveTintColor: colors.primary,
        drawerItemStyle: {
          borderRadius: radius.lg,
        },
        drawerLabelStyle: text.heading4,
        drawerPosition: 'right',
        drawerStyle: {
          backgroundColor: colors.background1,
        },
        headerShown: false,
      }}>
      {screens.map(({ component, name }) => (
        <Drawer.Screen component={component} key={name} name={name} />
      ))}
    </Drawer.Navigator>
  );
}

// copied from https://reactnavigation.org/docs/state-persistence/
const PERSISTENCE_KEY = 'NAVIGATION_STATE_V1';

function useNavigationState() {
  const [isReady, setIsReady] = useState(!__DEV__);

  const [navigationState, setNavigationState] = useState<
    NavigationState | undefined
  >();

  const updateNavigationState = useCallback((state?: NavigationState) => {
    AsyncStorage.setItem(PERSISTENCE_KEY, JSON.stringify(state)).catch(noop);
  }, []);

  useEffect(() => {
    const restoreState = async () => {
      try {
        const initialUrl = await Linking.getInitialURL();

        if (
          Platform.OS !== 'web' &&
          Platform.OS !== 'macos' &&
          initialUrl === null
        ) {
          // Only restore state if there's no deep link and we're not on web
          const savedStateString = await AsyncStorage.getItem(PERSISTENCE_KEY);
          // Erase the state immediately after fetching it.
          // This prevents the app to boot on the screen that previously crashed.
          updateNavigationState();
          const state = savedStateString
            ? (JSON.parse(savedStateString) as NavigationState)
            : undefined;

          if (state !== undefined) {
            setNavigationState(state);
          }
        }
      } finally {
        setIsReady(true);
      }
    };

    if (!isReady) {
      restoreState().catch(noop);
    }
  }, [isReady, updateNavigationState]);

  return { isReady, navigationState, updateNavigationState };
}
