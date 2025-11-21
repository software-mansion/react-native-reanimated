import { AppRegistry } from 'react-native';
// import App from './App';
import { name as appName } from './app.json';
import EmptyExample from '@/apps/reanimated/examples/EmptyExample';

AppRegistry.registerComponent(appName, () => EmptyExample);
