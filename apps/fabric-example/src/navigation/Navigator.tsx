import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StyleSheet, View } from 'react-native';
import type { Routes, TabRoute } from './types';
import { getScreenTitle, isRouteWithRoutes } from './utils';
import { Stagger, RouteCard, Scroll, Text } from '../components';
import { spacing, colors, flex, radius, iconSizes } from '../theme';
import { faExchange, faFire } from '@fortawesome/free-solid-svg-icons';
import { animationRoutes, transitionRoutes } from '../examples';
import { BackButton, BottomTabBar } from './components';
import { useSharedValue } from 'react-native-reanimated';
import type { FontVariant } from '../types';

// We use stack navigator to mimic the tab navigator, thus top-level routes will be
// displayed as tabs in the bottom tab bar
const tabRoutes = {
  Animations: {
    name: 'Animations',
    icon: faFire,
    routes: animationRoutes,
  },
  Transitions: {
    name: 'Transitions',
    icon: faExchange,
    routes: transitionRoutes,
  },
} satisfies Record<string, TabRoute>;

const Stack = createNativeStackNavigator<Record<string, React.ComponentType>>();

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

    const { name, CardComponent = RouteCard } = value;
    return (
      <View key={key} style={{ paddingLeft: (nestingDepth - 1) * spacing.md }}>
        <CardComponent route={`${path}/${key}`} title={name} />
      </View>
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
      <Scroll
        contentContainerStyle={styles.scrollViewContent}
        withBottomBarSpacing>
        <Stagger>{createRouteCards(routes, path, flatten)}</Stagger>
      </Scroll>
    );
  }

  RoutesScreen.displayName = path + 'RoutesScreen';

  return RoutesScreen;
}

export function createStackScreens(
  routes: Routes,
  path: string,
  parentName?: string,
  flatten = false,
  parentFlattened = false
): Array<React.ReactNode> {
  return [
    // Create a screen for the navigation routes
    !parentFlattened && (
      <Stack.Screen
        component={createRoutesScreen(routes, path, flatten)}
        key={path}
        name={path}
        options={{
          contentStyle: styles.content,
          title: parentName ?? getScreenTitle(path),
        }}
      />
    ),
    // Create screens for all nested routes or components
    ...Object.entries(routes).flatMap(([key, value]) => {
      const newPath = `${path}/${key}`;
      if (isRouteWithRoutes(value)) {
        return createStackScreens(
          value.routes,
          newPath,
          value.name,
          value.flatten,
          flatten
        );
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
    <View style={flex.fill}>
      <Stack.Navigator
        screenListeners={{
          focus: (e) => {
            currentRoute.value = e.target?.split('-')[0];
          },
        }}
        screenOptions={{
          headerLeft: () => <BackButton tabRoutes={routesArray} />,
          headerTintColor: colors.foreground1,
          animation: 'slide_from_right',
        }}>
        {Object.entries(tabRoutes).flatMap(([key, value]) =>
          createStackScreens(value.routes, key, value.name)
        )}
      </Stack.Navigator>
      <BottomTabBar routes={routesArray} currentRoute={currentRoute} />
    </View>
  );
}

const styles = StyleSheet.create({
  backButton: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xxs,
  },
  backButtonText: {
    color: colors.primary,
  },
  content: {
    backgroundColor: colors.background3,
  },
  scrollViewContent: {
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  listTitleWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  listBullet: {
    backgroundColor: colors.foreground1,
    width: iconSizes.xs,
    height: iconSizes.xs,
    marginRight: spacing.sm,
    borderRadius: radius.full,
  },
});
