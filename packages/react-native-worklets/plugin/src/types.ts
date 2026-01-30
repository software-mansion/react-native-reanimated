import type { BabelFile, NodePath } from '@babel/core';
import type {
  ArrowFunctionExpression,
  FunctionDeclaration,
  FunctionExpression,
  Node as BabelNode,
  ObjectExpression,
  ObjectMethod,
} from '@babel/types';
import {
  isArrowFunctionExpression,
  isFunctionDeclaration,
  isFunctionExpression,
  isObjectExpression,
  isObjectMethod,
} from '@babel/types';

import type { PluginOptions } from './options';

export interface WorkletsPluginPass {
  file: BabelFile;
  key: string;
  opts: PluginOptions;
  cwd: string;
  filename: string | undefined;
  workletNumber: number;
  classesToWorkletize: { node: BabelNode; name: string }[];
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

export const workletClassFactorySuffix = '__classFactory';

export const generatedWorkletsDir = '.worklets';
