import { StyleSheet, Text, View } from 'react-native';

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flexGrow: 1,
    justifyContent: 'center',
    backgroundColor: 'grey',
  },
  link: {
    color: 'blue',
    fontSize: 40,
  },
  textContainer: {
    alignItems: 'center',
    marginTop: 16,
  },
  text: {
    alignItems: 'center',
    fontSize: 50,
    marginBottom: 24,
  },
});

export default function App() {
  return (
    <View style={styles.container}>
      <Text accessibilityRole="header" style={styles.text}>
        Next example
      </Text>

      <Text style={styles.link} accessibilityRole="link" href={`/ssg`}>
        SSG
      </Text>

      <Text style={styles.link} accessibilityRole="link" href={`/ssr`}>
        SSR
      </Text>
    </View>
  );
}
