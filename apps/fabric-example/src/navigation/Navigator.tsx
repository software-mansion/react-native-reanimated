import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StyleSheet, View } from 'react-native';
import type { Routes, TabRoute } from './types';
import { getScreenTitle, hasRoutes } from './utils';
import { Stagger, RouteCard, Scroll } from '../components';
import { spacing, colors, flex } from '../theme';
import { faExchange, faFire } from '@fortawesome/free-solid-svg-icons';
import { animationRoutes, transitionRoutes } from '../examples';
import { BackButton, BottomTabBar } from './components';
import { useSharedValue } from 'react-native-reanimated';

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

function createRoutesScreen(routes: Routes, path: string): React.ComponentType {
  function RoutesScreen() {
    return (
      <Scroll
        contentContainerStyle={styles.scrollViewContent}
        withBottomBarSpacing>
        <Stagger>
          {Object.entries(routes).map(
            ([key, { CardComponent = RouteCard, name }]) => (
              <CardComponent key={key} route={`${path}/${key}`} title={name} />
            )
          )}
        </Stagger>
      </Scroll>
    );
  }

  RoutesScreen.displayName = path + 'RoutesScreen';

  return RoutesScreen;
}

export function createStackScreens(
  routes: Routes,
  path: string,
  parentName?: string
): Array<React.ReactNode> {
  return [
    // Create a screen for the navigation routes
    <Stack.Screen
      component={createRoutesScreen(routes, path)}
      key={path}
      name={path}
      options={{
        contentStyle: styles.content,
        title: parentName ?? getScreenTitle(path),
      }}
    />,
    // Create screens for all nested routes or components
    ...Object.entries(routes).flatMap(([key, value]) => {
      const newPath = `${path}/${key}`;
      if (hasRoutes(value)) {
        return createStackScreens(value.routes, newPath, value.name);
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
    paddingVertical: spacing.xl,
  },
});
