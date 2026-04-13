require('react-native/jest/setup');

// Don't load node environment envs if jest setup is configured to use jsdom
// (e.g. for web-specific tests)
if (typeof window === 'undefined') {
  require('react-native/jest/react-native-env.js');
}
