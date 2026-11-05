#pragma once

#include <jsi/jsi.h>
#include <worklets/AnimationFrameQueue/AnimationFrameBatchinator.h>
#include <worklets/NativeModules/JSIWorkletsModuleProxy.h>
#include <worklets/SharedItems/MemoryManager.h>
#include <worklets/SharedItems/UnpackerLoader.h>
#include <worklets/Tools/JSLogger.h>
#include <worklets/Tools/JSScheduler.h>
#include <worklets/Tools/RNRuntimeStatus.h>
#include <worklets/Tools/ScriptBuffer.h>
#include <worklets/Tools/SingleInstanceChecker.h>
#include <worklets/Tools/UIScheduler.h>
#include <worklets/WorkletRuntime/BundleModeConfig.h>
#include <worklets/WorkletRuntime/RuntimeManager.h>
#include <worklets/WorkletRuntime/WorkletRuntime.h>

#include <memory>
#include <optional>

namespace worklets {

/**
 * The initialization is a sequence of steps. The steps which do not need the RN Runtime run on background threads
 * before the bundle asks for the module. The steps which need the RN Runtime run on the JS thread.
 *
 * Every mode starts the same way:
 *
 *   1. Native module creation: the platform creates the native module before the bundle runs. The module creates a
 *      `WorkletsModuleProxyInitializer` and dispatches `WorkletsModuleProxyInitializer::prepareProxy` to a
 *      background thread.
 *   2. Background thread: `prepareProxy` calls the constructor of this class. The constructor creates the UI Worklet
 *      Runtime, but does not initialize it.
 *
 * Legacy Mode continues with:
 *
 *   3. JS thread: the bundle evaluates `NativeWorklets`, which calls `installTurboModule(false)`. The native module
 *      calls `WorkletsModuleProxyInitializer::finalize`. It waits for step 2 and calls `attachToRNRuntime` with a
 *      disabled Bundle Mode config. `attachToRNRuntime` creates the JSI proxy for the RN Runtime and installs it on
 *      the RN Runtime.
 *   4. JS thread: `NativeWorklets` hands the unpacker code to the JSI proxy.
 *   5. JS thread: `NativeWorklets` calls `start`. It initializes the UI Worklet Runtime and evaluates the unpacker
 *      code on it.
 *
 * Bundle Mode continues with:
 *
 *   3. JS thread: the `prepareBundleMode` polyfill runs before the first module of the bundle. The Worklets plugin
 *      enables the polyfill only when Bundle Mode is on. The polyfill calls `prepareBundleMode` on the native
 *      module. The module calls `WorkletsModuleProxyInitializer::beginBundleMode` and dispatches
 *      `WorkletsModuleProxyInitializer::prepareBundleMode` to a background thread.
 *   4. Background thread: `prepareBundleMode` waits for step 2, loads the bundle and calls
 *      `startUIRuntimeInBundleMode`. It stores the Bundle Mode config, initializes the UI Worklet Runtime and
 *      evaluates the bundle on it. This runs in parallel with the JS thread, which evaluates the bundle on the RN
 *      Runtime.
 *   5. JS thread: the bundle evaluates `NativeWorklets`, which calls `installTurboModule(true)`. The native module
 *      calls `WorkletsModuleProxyInitializer::finalize`. It waits for step 4 and calls `attachToRNRuntime` without
 *      a Bundle Mode config, because step 4 already stored it. `attachToRNRuntime` creates the JSI proxy for the RN
 *      Runtime and installs it on the RN Runtime.
 *   6. JS thread: `NativeWorklets` calls `start`. It returns immediately, because step 4 already initialized the UI
 *      Worklet Runtime.
 *
 * When Bundle Mode is enabled but the polyfill did not run, steps 3 and 4 are skipped. Step 5 then loads the bundle
 * and passes the Bundle Mode config to `attachToRNRuntime`, and step 6 initializes the UI Worklet Runtime by
 * evaluating the bundle on it, both on the JS thread.
 */
class WorkletsModuleProxy : public std::enable_shared_from_this<WorkletsModuleProxy> {
 public:
  void startUIRuntimeInBundleMode(const BundleModeConfig &bundleModeConfig);

  void attachToRNRuntime(jsi::Runtime &rnRuntime, const std::optional<BundleModeConfig> &bundleModeConfig);

  void start();

  explicit WorkletsModuleProxy(
      const std::shared_ptr<JSScheduler> &jsScheduler,
      const std::shared_ptr<UIScheduler> &uiScheduler,
      const std::shared_ptr<RuntimeBindings> &runtimeBindings,
      const std::shared_ptr<RNRuntimeStatus> &rnRuntimeStatus);

  ~WorkletsModuleProxy();

  [[nodiscard]] inline std::shared_ptr<JSScheduler> getJSScheduler() const {
    return jsScheduler_;
  }

  [[nodiscard]] inline std::shared_ptr<UIScheduler> getUIScheduler() const {
    return uiScheduler_;
  }

  [[nodiscard]] inline std::shared_ptr<JSLogger> getJSLogger() const {
    return jsLogger_;
  }

  [[nodiscard]] inline std::shared_ptr<WorkletRuntime> getUIWorkletRuntime() const {
    return uiWorkletRuntime_;
  }

  [[nodiscard]] inline bool isDevBundle() const {
    return isDevBundle_;
  }

 private:
  void startUIRuntime(const std::shared_ptr<JSIWorkletsModuleProxy> &uiRuntimeProxy);

  bool isDevBundle_;
  const std::shared_ptr<JSScheduler> jsScheduler_;
  const std::shared_ptr<UIScheduler> uiScheduler_;
  const std::shared_ptr<JSLogger> jsLogger_;
  const std::shared_ptr<RuntimeBindings> runtimeBindings_;
  BundleModeConfig bundleModeConfig_;
  const std::shared_ptr<MemoryManager> memoryManager_;
  const std::shared_ptr<RuntimeManager> runtimeManager_;
  const std::shared_ptr<UnpackerLoader> unpackerLoader_;
  const std::shared_ptr<RNRuntimeStatus> rnRuntimeStatus_;
  std::shared_ptr<WorkletRuntime> uiWorkletRuntime_;
  std::shared_ptr<JSIWorkletsModuleProxy> rnRuntimeProxy_;
  std::shared_ptr<AnimationFrameBatchinator> animationFrameBatchinator_;
  bool uiRuntimeStarted_;
#ifndef NDEBUG
  SingleInstanceChecker<WorkletsModuleProxy> singleInstanceChecker_;
#endif // NDEBUG
};

} // namespace worklets
