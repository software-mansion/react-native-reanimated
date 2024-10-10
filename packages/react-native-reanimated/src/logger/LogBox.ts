'use strict';
/**
 * Copied from: react-native/Libraries/LogBox/Data/LogBoxData.js
 * react-native/Libraries/LogBox/Data/parseLogBoxLog.js
 */

import type { LogBoxStatic } from 'react-native';
import { LogBox as RNLogBox } from 'react-native';

export type LogBoxLogLevel = 'warn' | 'error' | 'fatal' | 'syntax';

type Message = {
  content: string;
  substitutions: { length: number; offset: number }[];
};

type Category = string;

interface Location {
  row: number;
  column: number;
}

interface CodeFrame {
  content: string;
  location?: Location | null;
  fileName: string;
  collapse?: boolean;
}

type ComponentStack = CodeFrame[];

type ComponentStackType = 'legacy' | 'stack';

export type LogData = {
  level: LogBoxLogLevel;
  message: Message;
  category: Category;
  componentStack: ComponentStack;
  componentStackType: ComponentStackType | null;
  stack?: string;
};

interface LogBoxExtended extends LogBoxStatic {
  addLog(data: LogData): void;
}

const LogBox = RNLogBox as LogBoxExtended;

const noop = () => {
  // do nothing
};

// Do nothing when addLogBoxLog is called if LogBox is not available
export const addLogBoxLog = LogBox?.addLog?.bind(LogBox) ?? noop;
