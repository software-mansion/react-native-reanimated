import { useEffect, useState } from 'react';
import {
  BackHandler,
  Button,
  ScrollView,
  StyleSheet,
  Text,
} from 'react-native';

import { examples } from './examples';

type Example = (typeof examples)[number];

export default function App() {
  const [example, setExample] = useState<Example | null>(null);

  useEffect(() => {
    if (example === null) {
      return;
    }
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        setExample(null);
        return true;
      }
    );
    return () => subscription.remove();
  }, [example]);

  if (example !== null) {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <Button title="Back" onPress={() => setExample(null)} />
        <Text style={styles.title}>{example.title}</Text>
        <example.Screen />
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Worklets integration examples</Text>
      {examples.map((item) => (
        <Button
          key={item.id}
          testID={item.id}
          title={item.title}
          onPress={() => setExample(item)}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
    paddingHorizontal: 24,
    paddingTop: 80,
    paddingBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
});
