export function getUseOfValueInStyleWarning() {
  return (
    "It looks like you might be using shared value's .value inside reanimated inline style. " +
    'If you want a component to update when shared value changes you should use the shared value' +
    ' directly instead of its current state represented by `.value`. See documentation here: ' +
    'https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/animations#animations-in-inline-styles'
  );
}
