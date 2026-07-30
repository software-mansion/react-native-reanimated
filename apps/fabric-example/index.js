import React from 'react';
import { AppRegistry, LogBox } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

LogBox.ignoreLogs([
  /findNodeHandle is deprecated in StrictMode\. findNodeHandle was passed an instance of/,
  /findHostInstance_DEPRECATED is deprecated in StrictMode\. findHostInstance_DEPRECATED was passed an instance of/,
]);

function StrictApp() {
  return (
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

AppRegistry.registerComponent(appName, () => StrictApp);
