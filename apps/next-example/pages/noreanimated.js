import { StyleSheet, View, Text } from 'react-native';

export default function App() {
  return (
    <View style={styles.container}>
      <Text accessibilityRole="header" style={styles.text}>
        Reanimated Page
      </Text>
      {/* @ts-expect-error */}
      <Text style={styles.link} accessibilityRole="link" href="/">
        Go Back
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flexGrow: 1,
    justifyContent: 'center',
  },
  text: {
    alignItems: 'center',
    fontSize: 24,
    marginBottom: 24,
  },
  link: {
    color: 'blue',
  },
});
