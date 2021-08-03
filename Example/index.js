import { AppRegistry, Platform } from 'react-native';
import { name as appName } from './app.json';
import TestApp from './test/TestApp';

AppRegistry.registerComponent(appName, () => TestApp);

// TODO(Bacon): When `expo` has removed Updates, replace this with using the `expo` entry for better error handling
if (Platform.OS === 'web') {
  const rootTag = document.getElementById('root');
  AppRegistry.runApplication(appName, { rootTag });
}
