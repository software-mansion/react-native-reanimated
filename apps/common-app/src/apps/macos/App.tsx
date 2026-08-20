import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, text } from '@/theme';
import { createStack } from '@/utils';

import ReanimatedApp from '../reanimated/App';
import WorkletsApp from '../worklets/App';

const SCREENS = [
  { component: ReanimatedApp, name: 'Reanimated', title: '🐎 Reanimated' },
  { component: WorkletsApp, name: 'Worklets', title: '🧵 Worklets' },
];

type RootStackParamList = Record<string, undefined>;

const Stack = createStack<RootStackParamList>();

/**
 * The drawer navigator does not run on macOS, so the subapps are reached
 * through a plain stack instead.
 */
export default function App() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        component={HomeScreen}
        name="Home"
        options={{ headerTitle: 'Examples', title: 'Examples' }}
      />
      {SCREENS.map(({ component, name, title }) => (
        <Stack.Screen
          component={component}
          key={name}
          name={name}
          options={{ headerTitle: title, title }}
        />
      ))}
    </Stack.Navigator>
  );
}

function HomeScreen({
  navigation,
}: {
  navigation: { navigate: (name: string) => void };
}) {
  return (
    <View style={styles.container}>
      {SCREENS.map(({ name, title }) => (
        <Pressable
          key={name}
          style={styles.button}
          onPress={() => navigation.navigate(name)}>
          <Text style={styles.title}>{title}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: colors.primaryLight,
    borderRadius: radius.lg,
    padding: 16,
  },
  container: {
    gap: 12,
    padding: 16,
  },
  title: {
    ...text.heading4,
    color: colors.primaryDark,
  },
});
