'use strict';
import type { LogBoxStatic } from 'react-native';
import { LogBox as RNLogBox } from 'react-native';

export type LogLevel = 'warn' | 'error' | 'fatal' | 'syntax';

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
  level: LogLevel;
  message: Message;
  category: Category;
  componentStack: ComponentStack;
  componentStackType: ComponentStackType | null;
  stack?: string;
};

interface LogBoxExtended extends LogBoxStatic {
  addLog(data: LogData): void;
}

export const LogBox = RNLogBox as LogBoxExtended;
