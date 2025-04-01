import { useContext, useEffect, useState } from 'react';
import { Button, StyleSheet, Text, View } from 'react-native';

import { NukeContext } from '../App';

function registriesLeakCheck(): string {
  return global._registriesLeakCheck() ?? '';
}

export function LeakCheck() {
  const [leakCheck, setLeakCheck] = useState('');
  const goBack = useContext(NukeContext);

  useEffect(() => {
    setTimeout(() => setLeakCheck(registriesLeakCheck()), 100);
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.text}>{leakCheck}</Text>
      <Button
        title="reload"
        onPress={() => setLeakCheck(registriesLeakCheck())}
      />
      <Button title="go back" onPress={goBack} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', flex: 1, justifyContent: 'center' },
  text: { textAlign: 'right' },
});
