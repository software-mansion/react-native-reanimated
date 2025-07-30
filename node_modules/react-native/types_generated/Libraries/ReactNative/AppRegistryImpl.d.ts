/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @generated SignedSource<<cd12b23a8b0fc3374a44e21ab9ff4ca2>>
 *
 * This file was translated from Flow by scripts/build-types/index.js.
 * Original file: packages/react-native/Libraries/ReactNative/AppRegistryImpl.js
 */

import type { RootTag } from "../Types/RootTagTypes";
import type { AppConfig, AppParameters, ComponentProvider, ComponentProviderInstrumentationHook, Registry, RootViewStyleProvider, Runnable, Runnables, TaskProvider, WrapperComponentProvider } from "./AppRegistry.flow";
type TaskCanceller = () => void;
type TaskCancelProvider = () => TaskCanceller;
export declare function setWrapperComponentProvider(provider: WrapperComponentProvider): void;
export declare function setRootViewStyleProvider(provider: RootViewStyleProvider): void;
export declare function registerConfig(config: Array<AppConfig>): void;
/**
 * Registers an app's root component.
 *
 * See https://reactnative.dev/docs/appregistry#registercomponent
 */
export declare function registerComponent(appKey: string, componentProvider: ComponentProvider, section?: boolean): string;
export declare function registerRunnable(appKey: string, run: Runnable): string;
export declare function registerSection(appKey: string, component: ComponentProvider): void;
export declare function getAppKeys(): ReadonlyArray<string>;
export declare function getSectionKeys(): ReadonlyArray<string>;
export declare function getSections(): Runnables;
export declare function getRunnable(appKey: string): null | undefined | Runnable;
export declare function getRegistry(): Registry;
export declare function setComponentProviderInstrumentationHook(hook: ComponentProviderInstrumentationHook): void;
/**
 * Loads the JavaScript bundle and runs the app.
 *
 * See https://reactnative.dev/docs/appregistry#runapplication
 */
export declare function runApplication(appKey: string, appParameters: AppParameters, displayMode?: number): void;
/**
 * Update initial props for a surface that's already rendered
 */
export declare function setSurfaceProps(appKey: string, appParameters: Object, displayMode?: number): void;
/**
 * Stops an application when a view should be destroyed.
 *
 * See https://reactnative.dev/docs/appregistry#unmountapplicationcomponentatroottag
 */
export declare function unmountApplicationComponentAtRootTag(rootTag: RootTag): void;
/**
 * Register a headless task. A headless task is a bit of code that runs without a UI.
 *
 * See https://reactnative.dev/docs/appregistry#registerheadlesstask
 */
export declare function registerHeadlessTask(taskKey: string, taskProvider: TaskProvider): void;
/**
 * Register a cancellable headless task. A headless task is a bit of code that runs without a UI.
 *
 * See https://reactnative.dev/docs/appregistry#registercancellableheadlesstask
 */
export declare function registerCancellableHeadlessTask(taskKey: string, taskProvider: TaskProvider, taskCancelProvider: TaskCancelProvider): void;
/**
 * Only called from native code. Starts a headless task.
 *
 * See https://reactnative.dev/docs/appregistry#startheadlesstask
 */
export declare function startHeadlessTask(taskId: number, taskKey: string, data: any): void;
/**
 * Only called from native code. Cancels a headless task.
 *
 * See https://reactnative.dev/docs/appregistry#cancelheadlesstask
 */
export declare function cancelHeadlessTask(taskId: number, taskKey: string): void;
