import { PortalProvider } from '@gorhom/portal';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createDrawerNavigator } from '@react-navigation/drawer';
import type { NavigationState } from '@react-navigation/native';
import {
  getPathFromState,
  NavigationContainer,
} from '@react-navigation/native';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Linking, LogBox, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { colors, flex, radius, text } from '@/theme';
import { IS_MACOS, IS_WEB, noop } from '@/utils';

import { CSSApp, ReanimatedApp } from './apps';
import { SharedTransitionProvider } from './apps/reanimated/examples/SharedElementTransitions/SharedTransitionContext';
import { LeakCheck, NukeContext } from './components';

LogBox.ignoreLogs([
  "Deep imports from the 'react-native' package are deprecated",
]);

export default function App() {
  const [nuked, setNuked] = useState(false);
  const { isReady, navigationState, updateNavigationState } =
    useNavigationState();

  if (nuked) {
    return (
      <NukeContext value={() => setNuked(false)}>
        <LeakCheck />
      </NukeContext>
    );
  }

  if (!isReady) {
    return (
      <View style={[flex.fill, flex.center]}>
        <ActivityIndicator />
      </View>
    );
  }

  const RootApp = IS_MACOS ? ReanimatedApp : Navigator;

  return (
    <NukeContext value={() => setNuked(true)}>
      <GestureHandlerRootView style={flex.fill}>
        <NavigationContainer
          initialState={navigationState}
          linking={{
            getPathFromState: (state, options) =>
              getPathFromState(state, options).replace(/%2F/g, '/'),
            getStateFromPath: (path) => {
              const chunks = path.split('/').filter(Boolean);
              if (chunks.length === 0) return { routes: [] };

              const drawerRoute = chunks[0];
              const stackRoutes = chunks.slice(1).map((_, index, array) => ({
                name: array.slice(0, index + 1).join('/'),
              }));

              return {
                routes: [
                  {
                    name: drawerRoute,
                    state: {
                      routes: stackRoutes,
                    },
                  },
                ],
              };
            },
            prefixes: [],
          }}
          onStateChange={updateNavigationState}>
          <PortalProvider>
            <SharedTransitionProvider>
              {IS_MACOS ? (
                <RootApp />
              ) : (
                <SafeAreaProvider>
                  <RootApp />
                </SafeAreaProvider>
              )}
            </SharedTransitionProvider>
          </PortalProvider>
        </NavigationContainer>
      </GestureHandlerRootView>
    </NukeContext>
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
  const Drawer = createDrawerNavigator();
  const screens = IS_WEB ? SCREENS : SCREENS.reverse();

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
        drawerPosition: IS_WEB ? 'left' : 'right',
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

        if (!IS_MACOS && !IS_WEB && initialUrl === null) {
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
