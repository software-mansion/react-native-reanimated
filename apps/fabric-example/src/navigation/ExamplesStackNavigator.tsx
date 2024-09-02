import { faChevronLeft } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { useNavigation } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { memo } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInLeft, FadeInRight } from 'react-native-reanimated';

import exampleRoutes from './routes';
import type { Routes } from './types';
import { getScreenTitle, hasRoutes } from './utils';
import { Stagger, RouteCard } from '../components';
import { spacing, colors, flex } from '../theme';

const StackNavigator =
  createNativeStackNavigator<Record<string, React.ComponentType>>();

const BackButton = memo(function BackButton() {
  const navigation = useNavigation();

  const state = navigation.getState();
  if (!state) {
    console.log('here');
    return null;
  }

  const { index, routes } = state;
  const prevRoute = routes[index - 1];

  if (!prevRoute) {
    return null;
  }

  return (
    <TouchableOpacity
      hitSlop={spacing.md}
      style={styles.backButton}
      onPress={() => {
        navigation.goBack();
      }}>
      <FontAwesomeIcon color={colors.primary} icon={faChevronLeft} />
      <Animated.Text
        entering={FadeInRight}
        exiting={FadeInLeft}
        style={styles.backButtonText}>
        {getScreenTitle(prevRoute.name)}
      </Animated.Text>
    </TouchableOpacity>
  );
});

function createStackNavigator(routes: Routes): React.ComponentType {
  return function Navigator() {
    return (
      <View style={flex.fill}>
        <StackNavigator.Navigator
          screenOptions={{
            headerLeft: () => <BackButton />,
          }}>
          {createNavigationScreens(routes, 'Examples')}
        </StackNavigator.Navigator>
      </View>
    );
  };
}

function createRoutesScreen(routes: Routes, path: string): React.ComponentType {
  function RoutesScreen() {
    return (
      <ScrollView
        contentContainerStyle={styles.scrollViewContent}
        style={styles.scrollView}>
        <Stagger>
          {Object.entries(routes).map(
            ([key, { CardComponent = RouteCard, name }]) => (
              <CardComponent key={key} route={`${path}/${key}`} title={name} />
            )
          )}
        </Stagger>
      </ScrollView>
    );
  }

  RoutesScreen.displayName = path + 'RoutesScreen';

  return RoutesScreen;
}

function createNavigationScreens(
  routes: Routes,
  path: string,
  parentName?: string
): Array<React.ReactNode> {
  return [
    // Create a screen for the navigation routes
    <StackNavigator.Screen
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
        return createNavigationScreens(value.routes, newPath, value.name);
      }
      return (
        <StackNavigator.Screen
          component={value.Component}
          key={key}
          name={newPath}
          options={{ contentStyle: styles.content, title: value.name }}
        />
      );
    }),
  ];
}

const styles = StyleSheet.create({
  backButton: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xxs,
  },
  backButtonText: {
    color: colors.primary,
    fontSize: 16,
  },
  content: {
    backgroundColor: colors.background3,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },
  scrollViewContent: {
    gap: spacing.md,
  },
});

export default createStackNavigator(exampleRoutes);
