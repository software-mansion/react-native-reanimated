import { View, Button, StyleSheet, Text } from 'react-native';
import type { ReactNode } from 'react';
import React, { useEffect, useState } from 'react';
import { runTests, configure } from './RuntimeTestsApi';
import type { LockObject } from './types';

let renderLock: LockObject = { lock: false };
export class ErrorBoundary extends React.Component<
  { children: React.JSX.Element | Array<React.JSX.Element> },
  { hasError: boolean }
> {
  constructor(props: { children: React.JSX.Element | Array<React.JSX.Element> }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_: unknown) {
    // Update state so the next render will show the fallback UI.
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return <Text>Something went wrong.</Text>;
    }

    return this.props.children;
  }
}

export default function RuntimeTestsRunner() {
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
        // eslint-disable-next-line @typescript-eslint/no-misused-promises
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
