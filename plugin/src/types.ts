import type { BabelFile, NodePath } from '@babel/core';
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
  omitNativeOnlyData?: boolean;
  globals?: string[];
  substituteWebPlatformChecks?: boolean;
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

export type WorkletizableFunction =
  | FunctionDeclaration
  | FunctionExpression
  | ArrowFunctionExpression
  | ObjectMethod;

export const WorkletizableFunction =
  'FunctionDeclaration|FunctionExpression|ArrowFunctionExpression|ObjectMethod';

export function isWorkletizableFunctionType(
  path: NodePath
): path is NodePath<WorkletizableFunction> {
  return (
    path.isFunctionDeclaration() ||
    path.isFunctionExpression() ||
    path.isArrowFunctionExpression() ||
    path.isObjectMethod()
  );
}
