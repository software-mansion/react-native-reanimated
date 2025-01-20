import { faExchange, faFire } from '@fortawesome/free-solid-svg-icons';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createStackNavigator } from '@react-navigation/stack';
import { Platform, StyleSheet, View } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';

import { RouteCard, ScrollScreen, Stagger, Text } from '@/apps/css/components';
import { animationRoutes, transitionRoutes } from '@/apps/css/examples';
import { colors, flex, iconSizes, radius, spacing } from '@/theme';
import type { FontVariant } from '@/types';

import { BackButton, BottomTabBar } from './components';
import type { Routes, TabRoute } from './types';
import { getScreenTitle, isRouteWithRoutes } from './utils';

// We use stack navigator to mimic the tab navigator, thus top-level routes will be
// displayed as tabs in the bottom tab bar
const tabRoutes = {
  Animations: {
    icon: faFire,
    name: 'Animations',
    routes: animationRoutes,
  },
  Transitions: {
    icon: faExchange,
    name: 'Transitions',
    routes: transitionRoutes,
  },
} satisfies Record<string, TabRoute>;

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
    return (
      <ScrollScreen contentContainerStyle={styles.scrollViewContent}>
        <Stagger interval={50}>
          {createRouteCards(routes, path, flatten)}
        </Stagger>
      </ScrollScreen>
    );
  }

  RoutesScreen.displayName = path + 'RoutesScreen';

  return RoutesScreen;
}

type StackScreensOptions = {
  flatten: boolean;
  parentFlattened: boolean;
  depth: number;
};

function createStackScreens(
  routes: Routes,
  path: string,
  parentName?: string,
  options?: StackScreensOptions
): Array<React.ReactNode> {
  const { depth = 0, flatten = false, parentFlattened = false } = options ?? {};

  return [
    // Create a screen for the navigation routes
    !parentFlattened && (
      <Stack.Screen
        component={createRoutesScreen(routes, path, flatten)}
        key={path}
        name={path}
        options={{
          animation: depth === 0 ? 'none' : 'slide_from_right',
          contentStyle: styles.content,
          title: parentName ?? getScreenTitle(path),
        }}
      />
    ),
    // Create screens for all nested routes or components
    ...Object.entries(routes).flatMap(([key, value]) => {
      const newPath = `${path}/${key}`;
      if (isRouteWithRoutes(value)) {
        return createStackScreens(value.routes, newPath, value.name, {
          depth: depth + 1,
          flatten: !!value.flatten,
          parentFlattened: flatten,
        });
      }
      return (
        <Stack.Screen
          component={value.Component}
          key={key}
          name={newPath}
          options={{ contentStyle: styles.content, title: value.name }}
        />
      );
    }),
  ];
}

const INITIAL_ROUTE_NAME = Object.values(tabRoutes)[0]?.name;

export default function Navigator() {
  const currentRoute = useSharedValue<string | undefined>(INITIAL_ROUTE_NAME);
  const routesArray = Object.values(tabRoutes);

  return (
    <>
      <Stack.Navigator
        screenListeners={{
          focus: (e) => {
            currentRoute.value = e.target?.split('-')[0];
          },
        }}
        screenOptions={{
          animation: 'slide_from_right',
          headerLeft: () => <BackButton tabRoutes={routesArray} />,
          headerStyle: {
            backgroundColor: colors.background1,
          },
          headerTintColor: colors.foreground1,
          headerTitleAlign: 'center',
          statusBarStyle: 'dark',
        }}>
        {Object.entries(tabRoutes).flatMap(([key, value]) =>
          createStackScreens(value.routes, key, value.name)
        )}
      </Stack.Navigator>
      <BottomTabBar currentRoute={currentRoute} routes={routesArray} />
    </>
  );
}

const styles = StyleSheet.create({
  content: {
    ...flex.fill,
    backgroundColor: colors.background3,
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
  scrollViewContent: {
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
});
