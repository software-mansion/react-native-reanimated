/* eslint-disable @typescript-eslint/no-unsafe-function-type */
'use strict';

const remoteFunctionRegistry = new Map<number, Function>();

export let nextRemoteFunctionId = 1;

export function registerRemoteFunction(fun: Function): number {
  const id = nextRemoteFunctionId++;
  remoteFunctionRegistry.set(id, fun);
  return id;
}

globalThis.__remoteFunctionRegistry = remoteFunctionRegistry;
