import { View, Button, StyleSheet, Text } from 'react-native';
import React, { ReactNode, useEffect, useState } from 'react';
import { runTests, configure } from './RuntimeTestsApi';
import { LockObject } from './types';

let renderLock: LockObject = { lock: false };
export class ErrorBoundary extends React.Component<
  { children: React.JSX.Element | Array<React.JSX.Element> },
  { hasError: boolean }
> {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_) {
    // Update state so the next render will show the fallback UI.
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return <Text>Something went wrong.</Text>;
    }

    return this.props.children;
  }
}

export default RuntimeTestsRunner;
function RuntimeTestsRunner() {
  const [component, setComponent] = useState<ReactNode | null>(null);
  useEffect(() => {
    if (renderLock) {
      renderLock.lock = false;
    }
  }, [component]);
  return (
    <View style={styles.container}>
      <Button
        title="Run tests"
        onPress={async () => {
          renderLock = configure({ render: setComponent });
          await runTests();
        }}
      />
      {/* Don't render anything if component is undefined to prevent blinking */}
      {component || null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column',
  },
});
