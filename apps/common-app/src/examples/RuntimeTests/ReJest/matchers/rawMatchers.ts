import { makeMutable } from 'react-native-reanimated';
import { cyan, green, red, yellow } from '../utils/stringFormatUtils';
import type { TestValue, TrackerCallCount } from '../types';
import { ComparisonMode } from '../types';
import { getComparator } from './Comparators';
import { SyncUIRunner } from '../utils/SyncUIRunner';

type ToBeArgs = [TestValue, ComparisonMode?];
export type ToThrowArgs = [string?];
type ToBeWithinRangeArgs = [number, number];
type ToBeCalledArgs = [number];

export type SyncMatcherArguments = ToBeArgs | ToBeCalledArgs | ToBeWithinRangeArgs;
export type AsyncMatcherArguments = ToThrowArgs;
export type MatcherReturn = {
  pass: boolean;
  message: string;
};

export type Matcher<Args extends SyncMatcherArguments> = (
  currentValue: TestValue,
  negation: boolean,
  ...args: Args
) => MatcherReturn;

export type AsyncMatcher<Args extends AsyncMatcherArguments> = (
  currentValue: TestValue,
  negation: boolean,
  ...args: Args
) => Promise<MatcherReturn>;

function assertValueIsCallTracker(value: TrackerCallCount | TestValue): asserts value is TrackerCallCount {
  if (typeof value !== 'object' || !(value !== null && 'name' in value && 'onJS' in value && 'onUI' in value)) {
    throw Error(
      `Invalid value \`${value?.toString()}\`, expected a CallTracker. Use CallTracker returned by function \`getTrackerCallCount\` instead.`,
    );
  }
}

export const toBeMatcher: Matcher<ToBeArgs> = (currentValue, negation, expectedValue, comparisonModeUnknown) => {
  const comparisonMode: ComparisonMode =
    typeof comparisonModeUnknown === 'string' && comparisonModeUnknown in ComparisonMode
      ? (comparisonModeUnknown as ComparisonMode)
      : ComparisonMode.AUTO;

  const isEqual = getComparator(comparisonMode);
  return {
    pass: isEqual(expectedValue, currentValue),
    message: `Expected${negation ? ' NOT' : ''} ${green(expectedValue)} received ${red(currentValue)}, mode: ${yellow(
      comparisonMode,
    )}`,
  };
};

export const toBeWithinRangeMatcher: Matcher<ToBeWithinRangeArgs> = (
  currentValue,
  negation,
  minimumValue,
  maximumValue,
) => {
  const currentValueAsNumber = Number(Number(currentValue));
  const validInputTypes = typeof minimumValue === 'number' && typeof maximumValue === 'number';
  const isWithinRange = Number(minimumValue) <= currentValueAsNumber && currentValueAsNumber <= Number(maximumValue);

  return {
    pass: isWithinRange && validInputTypes,
    message: `Expected the value ${negation ? ' NOT' : ''}to be in range ${green(
      `[${minimumValue}, ${maximumValue}]`,
    )} received ${red(currentValue)}`,
  };
};

const toBeCalledOnThreadMatcher = (
  currentValue: TestValue,
  negation: boolean,
  times: number,
  thread: 'ALL' | 'JS' | 'UI',
) => {
  assertValueIsCallTracker(currentValue);
  const { onUI, onJS } = currentValue;
  const callsCount = {
    ALL: onUI + onJS,
    JS: onJS,
    UI: onUI,
  }[thread];

  return {
    pass: callsCount === times,
    message: `Expected ${cyan(currentValue.name)}${negation ? ' NOT' : ''} to be called ${green(times)} times${
      thread === 'ALL' ? '' : cyan(` on ${thread} thread`)
    }, but was called ${red(callsCount)} times`,
  };
};

export const toBeCalledMatcher: Matcher<ToBeCalledArgs> = (currentValue, negation, times) => {
  return toBeCalledOnThreadMatcher(currentValue, negation, times, 'ALL');
};

export const toBeCalledUIMatcher: Matcher<ToBeCalledArgs> = (currentValue, negation, times) => {
  return toBeCalledOnThreadMatcher(currentValue, negation, times, 'UI');
};

export const toBeCalledJSMatcher: Matcher<ToBeCalledArgs> = (currentValue, negation, times) => {
  return toBeCalledOnThreadMatcher(currentValue, negation, times, 'JS');
};

export const toThrowMatcher: AsyncMatcher<ToThrowArgs> = async (currentValue, negation, errorMessage) => {
  if (typeof currentValue !== 'function') {
    return { pass: false, message: `${currentValue?.toString()} is not a function` };
  }
  const [restoreConsole, checkErrors] = await mockConsole();

  try {
    await currentValue();
  } catch (e) {
    const message = (e as Error)?.message || '';
    const correctMessage = errorMessage ? errorMessage === message : true;

    return {
      pass: correctMessage,
      message: `Function was expected${negation ? ' NOT' : ''} to throw the message "${green(errorMessage)}"${
        negation ? '' : `, but received "${red(message)}`
      }"`,
    };
  }
  await restoreConsole();
  return checkErrors(negation, errorMessage);
};

async function mockConsole(): Promise<[() => Promise<void>, (negation: boolean, message?: string) => MatcherReturn]> {
  const syncUIRunner = new SyncUIRunner();
  let counterJS = 0;

  const counterUI = makeMutable(0);
  const recordedMessage = makeMutable('');

  const originalError = console.error;
  const originalWarning = console.warn;

  const incrementJS = () => {
    counterJS++;
  };
  const mockedConsoleFunction = (message: string) => {
    'worklet';
    if (_WORKLET) {
      counterUI.value++;
    } else {
      incrementJS();
    }
    recordedMessage.value = message.split('\n\nThis error is located at:')[0];
  };
  console.error = mockedConsoleFunction;
  console.warn = mockedConsoleFunction;
  await syncUIRunner.runOnUIBlocking(() => {
    'worklet';
    console.error = mockedConsoleFunction;
    console.warn = mockedConsoleFunction;
  });

  const restoreConsole = async () => {
    console.error = originalError;
    console.warn = originalWarning;
    await syncUIRunner.runOnUIBlocking(() => {
      'worklet';
      console.error = originalError;
      console.warn = originalWarning;
    });
  };

  const checkErrors = (negation: boolean, expectedMessage?: string) => {
    const count = counterUI.value + counterJS;
    const correctMessage = expectedMessage ? expectedMessage === recordedMessage.value : true;
    const correctCallNumber = count === 1;

    let errorMessage = '';
    if (!correctCallNumber) {
      errorMessage = `Function was expected${negation ? ' NOT' : ''} to throw exactly one error or warning, got ${red(
        count,
      )}.`;
    }
    if (!correctMessage) {
      errorMessage = `Function was expected${negation ? ' NOT' : ''} to throw the message "${green(expectedMessage)}"${
        negation ? '' : `, but received "${red(recordedMessage.value)}`
      }"`;
    }

    return { pass: correctCallNumber && correctMessage, message: errorMessage };
  };

  return [restoreConsole, checkErrors];
}
