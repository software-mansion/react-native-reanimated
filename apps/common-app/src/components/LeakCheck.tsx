import { useContext, useEffect, useState } from 'react';
import { Button, Text, View } from 'react-native';

import { DropContext } from '@/App';

function registriesLeakCheck(): string {
  if ('_registriesLeakCheck' in global) {
    // eslint-disable-next-line no-underscore-dangle
    return (global._registriesLeakCheck as () => string)();
  }
  return '';
}

export function LeakCheck() {
  const [leakCheck, setLeakCheck] = useState('');
  const goBack = useContext(DropContext);

  useEffect(() => {
    setTimeout(() => setLeakCheck(registriesLeakCheck()), 100);
  }, []);

  return (
    <View style={{ alignItems: 'center', flex: 1, justifyContent: 'center' }}>
      <Text style={{ textAlign: 'right' }}>{leakCheck}</Text>
      <Button
        title="reload"
        onPress={() => setLeakCheck(registriesLeakCheck())}
      />
      <Button title="go back" onPress={goBack} />
    </View>
  );
}
