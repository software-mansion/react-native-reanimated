'use strict';

import type { WorkletFactory, WorkletInitData } from './workletTypes';

let initDataRegistry: Map<number, WorkletInitData> = null!;
let workletFactoryRegistry: Map<number, WorkletFactory> = null!;

export function initializeWorkletRegistries() {
  if (!initDataRegistry) {
    initDataRegistry = new Map();
  }
  if (!workletFactoryRegistry) {
    workletFactoryRegistry = new Map();
  }

  // TODO: Remove.
  // @ts-ignore www
  globalThis.__getWorklet = __getWorklet;
  // @ts-ignore www
  globalThis.__registerWorkletInitData = __registerWorkletInitData;
  // @ts-ignore www
  globalThis.__registerWorkletFactory = __registerWorkletFactory;
}

initializeWorkletRegistries();

export function __registerWorkletInitData(
  hash: number,
  initData: WorkletInitData
) {
  initDataRegistry.set(hash, initData);
}

export function __registerWorkletFactory(
  hash: number,
  factory: WorkletFactory
) {
  workletFactoryRegistry.set(hash, factory);
}

export function __getWorklet<TClosureVariables extends unknown[]>(
  hash: number,
  initData: WorkletInitData,
  ...closureVariables: TClosureVariables
) {
  throw new Error('Dont use');
}
