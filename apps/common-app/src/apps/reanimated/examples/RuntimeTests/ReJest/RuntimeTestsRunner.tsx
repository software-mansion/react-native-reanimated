import type { ReactNode } from 'react';
import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { FlatList } from 'react-native-gesture-handler';

import { configure, runTests } from './RuntimeTestsApi';
import { RenderLock } from './utils/SyncUIRunner';

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
  disabled?: boolean;
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
    tests.forEach(testData => {
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      !testData.skipByDefault && testSelectionCallbacks.current.add(testData.importTest);
    });
  }, [tests]);

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
    <View style={styles.flexOne}>
      {started ? null : (
        <>
          <TestSelector tests={tests} testSelectionCallbacks={testSelectionCallbacks} />
          <Pressable onPressOut={handleStartClick} style={button}>
            <Text style={whiteText}>Run tests</Text>
          </Pressable>
        </>
      )}
      {/* Don't render anything if component is undefined to prevent blinking */}
      {component || null}
      {finished ? <Text style={navyText}>Reload the app to run the tests again</Text> : null}
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
    tests
      .filter(button => !button.disabled)
      .forEach(button => {
        setSelectedTests(selectedTests => new Map(selectedTests.set(button.testSuiteName, select)));
        if (select) {
          testSelectionCallbacks.current.add(button.importTest);
        } else {
          testSelectionCallbacks.current.delete(button.importTest);
        }
      });
  }

  function selectClick(button: TestData) {
    setSelectedTests(new Map(selectedTests.set(button.testSuiteName, !selectedTests.get(button.testSuiteName))));
    if (testSelectionCallbacks.current.has(button.importTest)) {
      testSelectionCallbacks.current.delete(button.importTest);
    } else {
      testSelectionCallbacks.current.add(button.importTest);
    }
  }

  return (
    <View style={styles.flexOne}>
      <SelectAllButtonProps handleSelectAllClick={selectAllClick} select={true} />
      <SelectAllButtonProps handleSelectAllClick={selectAllClick} select={false} />

      <FlatList
        style={styles.selectButtonsFrame}
        data={tests}
        renderItem={({ item }) => {
          return (
            <SelectTest
              key={item.testSuiteName}
              disabled={item.disabled}
              testSuiteName={item.testSuiteName}
              selectClick={() => selectClick(item)}
              selectedTests={selectedTests}
            />
          );
        }}
      />
    </View>
  );
}

interface SelectTestProps {
  testSuiteName: string;
  selectClick: () => void;
  selectedTests: Map<string, boolean>;
  disabled?: boolean;
}

function SelectTest({ testSuiteName, selectClick, selectedTests, disabled }: SelectTestProps) {
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
      disabled={disabled}
      style={[styles.buttonWrapper, isPressed ? styles.pressedButton : {}, disabled ? styles.disabledButton : {}]}
      onPressIn={() => handleSelectClickIn()}
      onPressOut={() => handleSelectClickOut()}>
      <View style={[styles.checkbox, selectedTests.get(testSuiteName) ? styles.checkedCheckbox : {}]} />
      <View style={selectButton}>
        <Text style={navyText}>{testSuiteName}</Text>
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
      style={[selectAllButton, isPressed ? styles.pressedButton : {}]}>
      <Text style={navyText}>{select ? 'Select all' : 'Deselect all'}</Text>
    </Pressable>
  );
}

const commonStyles = StyleSheet.create({
  textCommon: {
    fontSize: 20,
    alignSelf: 'center',
  },
  buttonCommon: {
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  whiteButtonCommon: {
    borderWidth: 2,
    backgroundColor: 'white',
    borderColor: 'navy',
    marginVertical: 5,
    borderRadius: 10,
  },
});

const basicStyles = StyleSheet.create({
  selectAllButton: { marginHorizontal: 20 },
  selectButton: { flex: 1 },
  button: { backgroundColor: 'navy', zIndex: 1, height: 60, marginBottom: 40 },
  navyText: { color: 'navy' },
  whiteText: { color: 'white' },
});

const whiteButtonCommon = StyleSheet.flatten([commonStyles.buttonCommon, commonStyles.whiteButtonCommon]);
const selectAllButton = StyleSheet.flatten([whiteButtonCommon, basicStyles.selectAllButton]);
const selectButton = StyleSheet.flatten([whiteButtonCommon, basicStyles.selectButton]);
const button = StyleSheet.flatten([commonStyles.buttonCommon, basicStyles.button]);
const navyText = StyleSheet.flatten([commonStyles.textCommon, basicStyles.navyText]);
const whiteText = StyleSheet.flatten([commonStyles.textCommon, basicStyles.whiteText]);

const styles = StyleSheet.create({
  flexOne: {
    flex: 1,
    flexDirection: 'column',
  },

  selectButtonsFrame: {
    borderRadius: 10,
    backgroundColor: 'lightblue',
    margin: 20,
    paddingHorizontal: 10,
    paddingVertical: 10,
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
  pressedButton: {
    zIndex: 2,
    backgroundColor: '#FFFA',
    borderRadius: 10,
    borderColor: '#FFFF',
  },
  disabledButton: {
    opacity: 0.5,
  },
});
