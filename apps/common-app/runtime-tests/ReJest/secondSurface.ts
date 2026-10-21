import type { ComponentType } from 'react';
import type { TurboModule } from 'react-native';
import { AppRegistry, TurboModuleRegistry } from 'react-native';

interface RuntimeTestsSurfaceModule extends TurboModule {
  start(componentName: string): Promise<number>;
  stop(rootTag: number): Promise<void>;
  prerender(componentName: string): Promise<number>;
  attachPrerendered(rootTag: number): Promise<void>;
  takePrerenderedDraws(rootTag: number): Promise<number[][]>;
  startWithoutRootView(componentName: string): Promise<number>;
  queuedPullItems(rootTag: number): Promise<number>;
  attachInNextDispatch(rootTag: number): Promise<DispatchAttachRecord>;
  attachOutsideDispatch(rootTag: number): Promise<OutsideDispatchAttachRecord>;
  startDispatchRecord(): Promise<void>;
  takeDispatchRecord(): Promise<number[][]>;
  stopWithoutRootView(rootTag: number): Promise<void>;
}

/**
 * Android test host only. What the module saw of a root view that a dispatch
 * attached in its `willMountItems`, after the listener of Reanimated.
 */
export type DispatchAttachRecord = {
  /** The pull mount items in the attach queue at the attach. */
  queuedPullItemsAtAttach: number;
  /**
   * The children of the root view after the layout mount report of the
   * dispatch.
   */
  childCountAtReport: number;
  childCountAfterDispatch: number;
  /**
   * Uptime, child count, and alpha and id of the first child at each draw of
   * the root view.
   */
  draws: number[][];
};

/**
 * Android test host only. A root view that a posted UI-thread task attached:
 * the queued pull items mount in the attach.
 */
export type OutsideDispatchAttachRecord = {
  queuedPullItemsAtAttach: number;
  isInDispatchAtAttach: boolean;
  childCountAfterAttach: number;
};

const MODULE_NAME = 'RuntimeTestsSurface';

let registeredComponentsCount = 0;

export function isSecondSurfaceAvailable(): boolean {
  return getSurfaceModule() !== null;
}

export function startSecondSurface(Component: ComponentType): Promise<number> {
  return getEnforcedSurfaceModule().start(registerSurfaceComponent(Component));
}

export function stopSecondSurface(rootTag: number): Promise<void> {
  return getEnforcedSurfaceModule().stop(rootTag);
}

function registerSurfaceComponent(Component: ComponentType) {
  const componentName = `RuntimeTestsSecondSurface${registeredComponentsCount++}`;
  AppRegistry.registerComponent(componentName, () => Component);
  return componentName;
}

/**
 * Android test host only: the surface renders and mounts before its view is in
 * a window.
 */
export function prerenderSecondSurface(
  Component: ComponentType
): Promise<number> {
  return getEnforcedSurfaceModule().prerender(
    registerSurfaceComponent(Component)
  );
}

/**
 * Puts the view of a prerendered surface in the window; `stopSecondSurface`
 * stops it.
 */
export function attachPrerenderedSurface(rootTag: number): Promise<void> {
  return getEnforcedSurfaceModule().attachPrerendered(rootTag);
}

/**
 * The draws of the root view of an attached prerendered surface since its
 * attach, in the form of `DispatchAttachRecord.draws`. Ends the record.
 */
export function takePrerenderedDraws(rootTag: number): Promise<number[][]> {
  return getEnforcedSurfaceModule().takePrerenderedDraws(rootTag);
}

/**
 * Android test host only: a surface with no root view at its start, so its
 * mount items wait in the attach queue.
 */
export function startSurfaceWithoutRootView(
  Component: ComponentType
): Promise<number> {
  return getEnforcedSurfaceModule().startWithoutRootView(
    registerSurfaceComponent(Component)
  );
}

export function queuedPullItemsOf(rootTag: number): Promise<number> {
  return getEnforcedSurfaceModule().queuedPullItems(rootTag);
}

/**
 * The next dispatch attaches a root view to the surface in its
 * `willMountItems`.
 */
export function attachRootViewInNextDispatch(
  rootTag: number
): Promise<DispatchAttachRecord> {
  return getEnforcedSurfaceModule().attachInNextDispatch(rootTag);
}

/** A posted UI-thread task attaches a root view to the surface, in no dispatch. */
export function attachRootViewOutsideDispatch(
  rootTag: number
): Promise<OutsideDispatchAttachRecord> {
  return getEnforcedSurfaceModule().attachOutsideDispatch(rootTag);
}

/**
 * Android test host only: a record of the uptime at the start and the end of
 * each dispatch of mount items.
 */
export function startDispatchRecord(): Promise<void> {
  return getEnforcedSurfaceModule().startDispatchRecord();
}

/** The dispatches since `startDispatchRecord`, as `[startMs, endMs]`. */
export function takeDispatchRecord(): Promise<number[][]> {
  return getEnforcedSurfaceModule().takeDispatchRecord();
}

export function stopSurfaceWithoutRootView(rootTag: number): Promise<void> {
  return getEnforcedSurfaceModule().stopWithoutRootView(rootTag);
}

function getEnforcedSurfaceModule(): RuntimeTestsSurfaceModule {
  const surfaceModule = getSurfaceModule();
  if (surfaceModule === null) {
    throw new Error(`The native module ${MODULE_NAME} is not available.`);
  }
  return surfaceModule;
}

function getSurfaceModule(): RuntimeTestsSurfaceModule | null {
  return (
    TurboModuleRegistry.get<RuntimeTestsSurfaceModule>(MODULE_NAME) ?? null
  );
}
