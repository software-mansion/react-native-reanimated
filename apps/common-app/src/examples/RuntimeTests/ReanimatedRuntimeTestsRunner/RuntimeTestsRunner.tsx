import { View, TouchableOpacity, StyleSheet, Text } from 'react-native';
import type { ReactNode } from 'react';
import React, { useEffect, useState } from 'react';
import { runTests, configure } from './RuntimeTestsApi';
import type { LockObject } from './types';

interface ImportButton {
  testSuiteName: string;
  importTest: () => void;
}

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

function ImportButtons({ importButtons }: { importButtons: Array<ImportButton> }) {
  const [importedTests, setImportedTests] = useState<Array<string>>([]);

  return (
    <View>
      {importButtons.map(({ testSuiteName, importTest }) => {
        return (
          <TouchableOpacity
            key={testSuiteName}
            onPress={() => {
              importTest();
              if (!importedTests.includes(testSuiteName)) {
                setImportedTests([...importedTests, testSuiteName]);
              }
            }}
            style={
              importedTests.includes(testSuiteName)
                ? [styles.importButton, styles.importButtonImported]
                : styles.importButton
            }>
            <Text style={styles.buttonText}>{testSuiteName}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function RuntimeTestsRunner({ importButtons }: { importButtons: Array<ImportButton> }) {
  const [component, setComponent] = useState<ReactNode | null>(null);
  const [started, setStarted] = useState<boolean>(false);
  useEffect(() => {
    if (renderLock) {
      renderLock.lock = false;
    }
  }, [component]);
  return (
    <View style={styles.container}>
      {started ? null : <ImportButtons importButtons={importButtons} />}
      {started ? null : (
        <TouchableOpacity
          // eslint-disable-next-line @typescript-eslint/no-misused-promises
          onPress={async () => {
            setStarted(true);
            renderLock = configure({ render: setComponent });
            await runTests();
          }}
          style={styles.button}>
          <Text style={styles.buttonTextWhite}>Run tests</Text>
        </TouchableOpacity>
      )}

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
  importButton: {
    height: 40,
    borderWidth: 2,
    marginHorizontal: 40,
    marginVertical: 5,
    borderRadius: 10,
    borderColor: 'navy',
    justifyContent: 'center',
    alignItems: 'center',
  },
  importButtonImported: {
    backgroundColor: 'pink',
  },
  button: {
    height: 40,
    marginVertical: 10,
    backgroundColor: 'navy',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 20,
    color: 'navy',
  },
  buttonTextWhite: {
    fontSize: 20,
    color: 'white',
  },
});
