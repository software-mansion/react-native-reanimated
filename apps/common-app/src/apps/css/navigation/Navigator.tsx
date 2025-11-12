import { useNavigation } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createStackNavigator } from '@react-navigation/stack';
import { memo } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { useReducedMotion, useSharedValue } from 'react-native-reanimated';

import { RouteCard, Text } from '@/apps/css/components';
import { BackButton, DrawerButton } from '@/components';
import { colors, flex, iconSizes, radius, spacing } from '@/theme';
import type { FontVariant } from '@/types';

import BottomTabBar from './BottomTabBar';
import {
  LocalNavigationProvider,
  useLocalNavigationRef,
} from './LocalNavigationProvider';
import { INITIAL_ROUTE_NAME, TAB_ROUTES } from './routes';
import { PullToSearchProvider, SearchScreen } from './search';
import type { Routes } from './types';
import { isRouteWithRoutes } from './utils';

type RootStackParamList = Record<string, React.ComponentType>;

const Stack =
  Platform.OS === 'macos'
    ? createStackNavigator<RootStackParamList>()
    : createNativeStackNavigator<RootStackParamList>();

function createRouteCards(
  routes: Routes,
  path: string,
  parentFlatten = false,
  nestingDepth = 0
): React.ReactNode {
  return Object.entries(routes).flatMap(([key, value]) => {
    if (parentFlatten && isRouteWithRoutes(value)) {
      return [
        <View
          key={key}
          style={[
            styles.listTitleWrapper,
            { paddingLeft: nestingDepth * spacing.md },
          ]}>
          {nestingDepth > 0 && <View style={styles.listBullet} />}
          <Text
            variant={`heading${Math.min(nestingDepth + 3, 4)}` as FontVariant}>
            {value.name}
          </Text>
        </View>,
        createRouteCards(
          value.routes,
          `${path}/${key}`,
          value.flatten,
          nestingDepth + 1
        ),
      ];
    }

    const {
      CardComponent = RouteCard,
      displayed = true,
      name,
      ...rest
    } = value;

    return (
      displayed && (
        <View
          key={key}
          style={{ paddingLeft: (nestingDepth - 1) * spacing.md }}>
          <CardComponent {...rest} route={`${path}/${key}`} title={name} />
        </View>
      )
    );
  });
}

function createRoutesScreen(
  routes: Routes,
  path: string,
  flatten: boolean
): React.ComponentType {
  function RoutesScreen() {
    const navigation = useNavigation();
    const localNavigationRef = useLocalNavigationRef();

    localNavigationRef.current ??= navigation;

    return (
      <SearchScreen>{createRouteCards(routes, path, flatten)}</SearchScreen>
    );
  }

  RoutesScreen.displayName = path + 'RoutesScreen';

  return RoutesScreen;
}

type StackScreensOptions = {
  flatten: boolean;
  depth: number;
  parentOptions?: StackScreensOptions;
};

function createStackScreens(
  routes: Routes,
  name: string,
  pathChunks: Array<string>,
  reducedMotion: boolean,
  options?: StackScreensOptions
): Array<React.ReactNode> {
  const { depth = 0, flatten = false } = options ?? {};

  const path = pathChunks.join('/');

  const sharedOptions = {
    contentStyle: styles.content,
    headerLeft: () => <BackButton />,
    headerRight: () => <DrawerButton />,
  };

  return [
    // Create a screen for the navigation routes
    !options?.parentOptions?.flatten && (
      <Stack.Screen
        component={createRoutesScreen(routes, path, flatten)}
        key={path}
        name={path}
        options={{
          ...sharedOptions,
          animation: reducedMotion || depth === 0 ? 'none' : 'default',
          title: name,
        }}
      />
    ),
    // Create screens for all nested routes or components
    ...Object.entries(routes).flatMap(([key, value]) => {
      const newPath = `${path}/${key}`;
      if (isRouteWithRoutes(value)) {
        return createStackScreens(
          value.routes,
          value.name,
          [...pathChunks, key],
          reducedMotion,
          {
            depth: depth + 1,
            flatten: !!value.flatten,
            parentOptions: options,
          }
        );
      }

      const ScreenComponent = value.Component;

      return (
        <Stack.Screen
          key={key}
          name={newPath}
          options={{
            ...sharedOptions,
            animation: 'slide_from_right',
            title: value.name,
          }}>
          {(props) => (
            <ScreenComponent {...props} labelTypes={value.labelTypes} />
          )}
        </Stack.Screen>
      );
    }),
  ];
}

function Navigator() {
  const shouldReduceMotion = useReducedMotion();
  const currentRoute = useSharedValue<string | undefined>(INITIAL_ROUTE_NAME);
  const tabRoutesArray = Object.values(TAB_ROUTES);

  return (
    <LocalNavigationProvider>
      <PullToSearchProvider>
        <Stack.Navigator
          screenListeners={{
            focus: (e) => {
              currentRoute.value = e.target?.split('-')[0];
            },
          }}
          screenOptions={{
            animation: 'default',
            gestureEnabled: true,
            headerStyle: {
              backgroundColor: colors.background1,
            },
            headerTintColor: colors.foreground1,
            headerTitleAlign: 'center',
            statusBarStyle: 'dark',
          }}>
          {Object.entries(TAB_ROUTES).flatMap(([key, value]) =>
            createStackScreens(
              value.routes,
              value.name,
              [key],
              shouldReduceMotion
            )
          )}
        </Stack.Navigator>
        <BottomTabBar currentRoute={currentRoute} routes={tabRoutesArray} />
      </PullToSearchProvider>
    </LocalNavigationProvider>
  );
}

const styles = StyleSheet.create({
  content: {
    ...flex.fill,
    backgroundColor: colors.background3,
    overflow: 'hidden',
  },
  listBullet: {
    backgroundColor: colors.foreground1,
    borderRadius: radius.full,
    height: iconSizes.xs,
    marginRight: spacing.sm,
    width: iconSizes.xs,
  },
  listTitleWrapper: {
    alignItems: 'center',
    flexDirection: 'row',
  },
});

export default memo(Navigator);
