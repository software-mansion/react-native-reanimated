import React from 'react'
import { AppRegistry, Platform, View, Text } from 'react-native';
import { name as appName } from './app.json';
import TestSuite from './test-suite/App';

AppRegistry.registerComponent(appName, () => TestSuite);

// TODO(Bacon): When `expo` has removed Updates, replace this with using the `expo` entry for better error handling
if (Platform.OS === 'web') {
  const rootTag = document.getElementById('root');
  AppRegistry.runApplication(appName, { rootTag });
}
