import { Node } from '@babel/core';

export function assertIsDefined<T>(
  value: T,
  name: string
): asserts value is NonNullable<T> {
  if (value === undefined || value === null) {
    throw new Error(`${name} is not defined`);
  }
}

export function assertIsASTType<T extends Node>(
  value: Node,
  name: string,
  type: string,
  typecheckFunction: (arg: Node) => arg is T
): asserts value is T {
  if (!typecheckFunction(value)) {
    throw new Error(`${name} is not of type ${type}\n`);
  }
}

export function assertIsNotType<T extends Node>(
  value: Node,
  name: string,
  type: string,
  typecheckFunction: (arg: Node) => arg is T
): asserts value is Exclude<Node, T> {
  if (typecheckFunction(value)) {
    throw new Error(`${name} is of type ${type}\n`);
  }
}

export function assertHasProperty(
  condition: boolean,
  name: string,
  prop: string
): asserts condition {
  if (!condition) {
    throw new Error(`${name} does not have property ${prop}\n`);
  }
}
