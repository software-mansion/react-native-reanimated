import { View, TouchableOpacity, StyleSheet, Text } from 'react-native';
import type { ReactNode } from 'react';
import React, { useEffect, useState } from 'react';
import { runTests, configure } from './RuntimeTestsApi';
import type { LockObject } from './types';

interface ImportButton {
  testSuiteName: string;
  importTest: () => void;
  testOfTests?: boolean;
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
      return <Text>Unable to render component</Text>;
    }

    return this.props.children;
  }
}

function ImportButtons({ importButtons }: { importButtons: Array<ImportButton> }) {
  const [importedTests, setImportedTests] = useState<Array<string>>([]);
  const [importedAll, setImportedAll] = useState(false);

  const handleImportAllClick = () => {
    setImportedAll(true);
    let newImportedTests = [...importedTests];
    for (const button of importButtons) {
      if (!button.testOfTests) {
        button.importTest();
        if (!importedTests.includes(button.testSuiteName)) {
          newImportedTests = [...newImportedTests, button.testSuiteName];
        }
      }
    }
    setImportedTests(newImportedTests);
  };

  const handleImportClick = (button: ImportButton) => {
    button.importTest();
    if (!importedTests.includes(button.testSuiteName)) {
      setImportedTests([...importedTests, button.testSuiteName]);
    }
  };
  return (
    <View>
      <TouchableOpacity
        onPress={handleImportAllClick}
        style={[styles.importButton, styles.importAllButton, importedAll ? styles.importButtonImported : {}]}>
        <Text style={styles.buttonText}>Import all reanimated tests</Text>
      </TouchableOpacity>

      <View style={styles.importButtonsFrame}>
        {importButtons.map(importButton => {
          const { testSuiteName } = importButton;
          return (
            <TouchableOpacity
              key={testSuiteName}
              onPress={() => {
                handleImportClick(importButton);
              }}
              style={[styles.importButton, importedTests.includes(testSuiteName) ? styles.importButtonImported : {}]}>
              <Text style={styles.buttonText}>{testSuiteName}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
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
  importAllButton: {
    marginHorizontal: 20,
    marginTop: 20,
  },
  importButtonsFrame: {
    borderRadius: 10,
    backgroundColor: 'lightblue',
    margin: 20,
    paddingHorizontal: 40,
    paddingVertical: 10,
  },
  importButton: {
    height: 40,
    borderWidth: 2,
    marginVertical: 5,
    borderRadius: 10,
    backgroundColor: 'white',
    borderColor: 'navy',
    justifyContent: 'center',
    alignItems: 'center',
  },
  importButtonImported: {
    backgroundColor: 'pink',
  },
  button: {
    height: 40,
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
