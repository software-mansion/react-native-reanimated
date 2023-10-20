import type { BabelFile } from '@babel/core';
import type {
  FunctionDeclaration,
  FunctionExpression,
  ObjectMethod,
  ArrowFunctionExpression,
} from '@babel/types';

export interface ReanimatedPluginOptions {
  relativeSourceLocation?: boolean;
  disableInlineStylesWarning?: boolean;
  processNestedWorklets?: boolean;
  isWeb?: boolean;
  globals?: string[];
}

export interface ReanimatedPluginPass {
  file: BabelFile;
  key: string;
  opts: ReanimatedPluginOptions;
  cwd: string;
  filename: string | undefined;
  get(key: unknown): unknown;
  set(key: unknown, value: unknown): void;
  [key: string]: unknown;
}

export type ExplicitWorklet =
  | FunctionDeclaration
  | FunctionExpression
  | ArrowFunctionExpression;

export type WorkletizableFunction = ExplicitWorklet | ObjectMethod;
