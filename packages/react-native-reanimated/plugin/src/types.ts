import type { BabelFile, NodePath } from '@babel/core';
import {
  isArrowFunctionExpression,
  isFunctionDeclaration,
  isFunctionExpression,
  isObjectMethod,
  isObjectExpression,
} from '@babel/types';
import type {
  FunctionDeclaration,
  FunctionExpression,
  ObjectMethod,
  ArrowFunctionExpression,
  ObjectExpression,
  Node as BabelNode,
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

export type WorkletizableObject = ObjectExpression;

export const WorkletizableObject = 'ObjectExpression';

export function isWorkletizableFunctionPath(
  path: NodePath<unknown>
): path is NodePath<WorkletizableFunction> {
  return (
    path.isFunctionDeclaration() ||
    path.isFunctionExpression() ||
    path.isArrowFunctionExpression() ||
    path.isObjectMethod()
  );
}

export function isWorkletizableFunctionNode(
  node: BabelNode | null | undefined
): node is WorkletizableFunction {
  return (
    isFunctionDeclaration(node) ||
    isFunctionExpression(node) ||
    isArrowFunctionExpression(node) ||
    isObjectMethod(node)
  );
}

export function isWorkletizableObjectPath(
  path: NodePath<unknown>
): path is NodePath<WorkletizableObject> {
  return path.isObjectExpression();
}

export function isWorkletizableObjectNode(
  node: BabelNode | null | undefined
): node is WorkletizableObject {
  return isObjectExpression(node);
}
