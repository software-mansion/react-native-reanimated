import './src/installUncaughtErrorReporter';
import 'react-native-reanimated';

import { AppRegistry } from 'react-native';

import { name as appName } from './app.json';
import { App } from './src/App';

AppRegistry.registerComponent(appName, () => App);
