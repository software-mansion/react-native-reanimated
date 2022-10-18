// Workaround from https://github.com/expo/expo/issues/18485

import 'expo/build/Expo.fx';

import App from './App';
import { createRoot } from 'react-dom/client';
import withExpoRoot from 'expo/build/launch/withExpoRoot';

const rootTag = createRoot(
  document.getElementById('root') ?? document.getElementById('main')
);
const RootComponent = withExpoRoot(App);
rootTag.render(<RootComponent />);
