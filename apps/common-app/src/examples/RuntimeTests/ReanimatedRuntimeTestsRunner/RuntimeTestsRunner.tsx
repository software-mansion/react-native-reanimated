import { View, StyleSheet, Text, Pressable } from 'react-native';
import type { ReactNode } from 'react';
import React, { useEffect, useRef, useState } from 'react';
import { runTests, configure } from './RuntimeTestsApi';
import { RenderLock } from './SyncUIRunner';

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

let renderLock: RenderLock = new RenderLock();

interface TestData {
  testSuiteName: string;
  importTest: () => void;
  skipByDefault?: boolean;
}

interface RuntimeTestRunnerProps {
  tests: TestData[];
}

export default function RuntimeTestsRunner({ tests }: RuntimeTestRunnerProps) {
  const [component, setComponent] = useState<ReactNode | null>(null);
  const [started, setStarted] = useState<boolean>(false);
  const [finished, setFinished] = useState<boolean>(false);

  const testSelectionCallbacks = useRef<Set<() => void>>(new Set());
  useEffect(() => {
    if (renderLock) {
      renderLock.unlock();
    }
  }, [component]);

  async function run() {
    renderLock = configure({ render: setComponent });
    await runTests();
    setFinished(true);
  }

  function handleStartClick() {
    testSelectionCallbacks.current.forEach(callback => callback());
    setStarted(true);
    // eslint-disable-next-line no-void
    void run();
  }

  return (
    <View style={styles.container}>
      {started ? null : (
        <>
          <TestSelector tests={tests} testSelectionCallbacks={testSelectionCallbacks} />
          <Pressable onPressOut={handleStartClick} style={styles.button}>
            <Text style={styles.buttonTextWhite}>Run tests</Text>
          </Pressable>
        </>
      )}
      {/* Don't render anything if component is undefined to prevent blinking */}
      {component || null}
      {finished ? <Text style={styles.reloadText}>Reload the app to run the tests again</Text> : null}
    </View>
  );
}

interface TestSelectorProps {
  tests: Array<TestData>;
  testSelectionCallbacks: React.RefObject<Set<() => void>>;
}

function TestSelector({ tests, testSelectionCallbacks }: TestSelectorProps) {
  const [selectedTests, setSelectedTests] = useState<Map<string, boolean>>(
    tests.reduce((acc, testData) => {
      acc.set(testData.testSuiteName, !testData.skipByDefault);
      return acc;
    }, new Map<string, boolean>()),
  );

  function selectAllClick(select: boolean) {
    tests.forEach(button => {
      setSelectedTests(selectedTests => new Map(selectedTests.set(button.testSuiteName, select)));
      if (select) {
        testSelectionCallbacks.current!.add(button.importTest);
      } else {
        testSelectionCallbacks.current!.delete(button.importTest);
      }
    });
  }

  function selectClick(button: TestData) {
    setSelectedTests(new Map(selectedTests.set(button.testSuiteName, !selectedTests.get(button.testSuiteName))));
    if (testSelectionCallbacks.current!.has(button.importTest)) {
      testSelectionCallbacks.current!.delete(button.importTest);
    } else {
      testSelectionCallbacks.current!.add(button.importTest);
    }
  }

  return (
    <View>
      <SelectAllButtonProps handleSelectAllClick={selectAllClick} select={true} />
      <SelectAllButtonProps handleSelectAllClick={selectAllClick} select={false} />

      <View style={styles.selectButtonsFrame}>
        {tests.map(testData => {
          return (
            <SelectTest
              key={testData.testSuiteName}
              testSuiteName={testData.testSuiteName}
              selectClick={() => selectClick(testData)}
              selectedTests={selectedTests}
            />
          );
        })}
      </View>
    </View>
  );
}

interface SelectTestProps {
  testSuiteName: string;
  selectClick: () => void;
  selectedTests: Map<string, boolean>;
}

function SelectTest({ testSuiteName, selectClick, selectedTests }: SelectTestProps) {
  const [isPressed, setIsPressed] = useState<boolean>(false);

  function handleSelectClickIn() {
    setIsPressed(true);
  }

  function handleSelectClickOut() {
    selectClick();
    setIsPressed(false);
  }

  return (
    <Pressable
      style={[styles.buttonWrapper, isPressed ? styles.pressedButton : {}]}
      onPressIn={() => handleSelectClickIn()}
      onPressOut={() => handleSelectClickOut()}>
      <View style={[styles.checkbox, selectedTests.get(testSuiteName) ? styles.checkedCheckbox : {}]} />
      <View style={styles.selectButton}>
        <Text style={styles.buttonText}>{testSuiteName}</Text>
      </View>
    </Pressable>
  );
}

interface SelectAllButtonProps {
  handleSelectAllClick: (select: boolean) => void;
  select: boolean;
}

function SelectAllButtonProps({ handleSelectAllClick, select }: SelectAllButtonProps) {
  const [isPressed, setIsPressed] = useState<boolean>(false);

  function handleSelectAllClickIn() {
    setIsPressed(true);
  }

  function handleSelectAllClickOut() {
    handleSelectAllClick(select);
    setIsPressed(false);
  }

  return (
    <Pressable
      onPressIn={handleSelectAllClickIn}
      onPressOut={() => handleSelectAllClickOut()}
      style={[styles.selectAllButton, isPressed ? styles.pressedButton : {}]}>
      <Text style={styles.buttonText}>{select ? 'Select all' : 'Deselect all'}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column',
  },
  selectAllButton: {
    marginVertical: 5,
    marginHorizontal: 20,
    height: 40,
    borderWidth: 2,
    borderRadius: 10,
    backgroundColor: 'white',
    borderColor: 'navy',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectButtonsFrame: {
    borderRadius: 10,
    backgroundColor: 'lightblue',
    margin: 20,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  selectButton: {
    height: 40,
    borderWidth: 2,
    marginVertical: 5,
    borderRadius: 10,
    backgroundColor: 'white',
    borderColor: 'navy',
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
  },
  button: {
    height: 40,
    backgroundColor: 'navy',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  buttonText: {
    fontSize: 20,
    color: 'navy',
  },
  buttonTextWhite: {
    fontSize: 20,
    color: 'white',
  },
  buttonWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  checkbox: {
    width: 20,
    height: 20,
    marginRight: 10,
    borderWidth: 2,
    backgroundColor: 'white',
    borderColor: 'navy',
    borderRadius: 5,
  },
  checkedCheckbox: {
    backgroundColor: 'navy',
  },
  reloadText: {
    fontSize: 20,
    color: 'navy',
    alignSelf: 'center',
  },
  pressedButton: {
    zIndex: 2,
    backgroundColor: '#FFFA',
    borderRadius: 10,
    borderColor: '#FFFF',
  },
});
