import { BabelFile } from '@babel/core';
import {
  FunctionDeclaration,
  FunctionExpression,
  ObjectMethod,
  ArrowFunctionExpression,
} from '@babel/types';

export interface ReanimatedPluginPass {
  file: BabelFile;
  key: string;
  opts: {
    relativeSourceLocation?: boolean;
    disableInlineStylesWarning?: boolean;
  };
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
