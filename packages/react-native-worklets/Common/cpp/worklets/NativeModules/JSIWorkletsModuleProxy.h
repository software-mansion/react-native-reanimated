#pragma once

#include <jsi/jsi.h>
#include <worklets/SharedItems/MemoryManager.h>
#include <worklets/SharedItems/Serializable.h>
#include <worklets/SharedItems/UnpackerLoader.h>
#include <worklets/Tools/ScriptBuffer.h>
#include <worklets/WorkletRuntime/BundleModeConfig.h>
#include <worklets/WorkletRuntime/RuntimeBindings.h>
#include <worklets/WorkletRuntime/RuntimeData.h>
#include <worklets/WorkletRuntime/RuntimeManager.h>

#include <memory>
#include <string>

using namespace facebook;

namespace worklets {

class WorkletRuntime;

class JSIWorkletsModuleProxy : public std::enable_shared_from_this<JSIWorkletsModuleProxy> {
 public:
  explicit JSIWorkletsModuleProxy(
      const bool isDevBundle,
      const std::shared_ptr<JSScheduler> &jsScheduler,
      const std::shared_ptr<UIScheduler> &uiScheduler,
      const std::shared_ptr<MemoryManager> &memoryManager,
      const std::shared_ptr<RuntimeManager> &runtimeManager,
      const std::weak_ptr<WorkletRuntime> &uiWorkletRuntime,
      const std::shared_ptr<RuntimeBindings> &runtimeBindings,
      const BundleModeConfig &bundleModeConfig,
      const std::shared_ptr<UnpackerLoader> &unpackerLoader,
      RuntimeData::RuntimeId hostRuntimeId)
      : isDevBundle_(isDevBundle),
        bundleModeConfig_(bundleModeConfig),
        jsScheduler_(jsScheduler),
        uiScheduler_(uiScheduler),
        memoryManager_(memoryManager),
        runtimeManager_(runtimeManager),
        uiWorkletRuntime_(uiWorkletRuntime),
        runtimeBindings_(runtimeBindings),
        unpackerLoader_(unpackerLoader),
        hostRuntimeId_(hostRuntimeId) {}

  static std::shared_ptr<JSIWorkletsModuleProxy> createForNewRuntime(
      const std::shared_ptr<const JSIWorkletsModuleProxy> &sourceProxy,
      RuntimeData::RuntimeId hostRuntimeId) {
    return std::make_shared<JSIWorkletsModuleProxy>(
        sourceProxy->isDevBundle_,
        sourceProxy->jsScheduler_,
        sourceProxy->uiScheduler_,
        sourceProxy->memoryManager_,
        sourceProxy->runtimeManager_,
        sourceProxy->uiWorkletRuntime_,
        sourceProxy->runtimeBindings_,
        sourceProxy->bundleModeConfig_,
        sourceProxy->unpackerLoader_,
        hostRuntimeId);
  }

  /** No copy constructor to prevent making JSIWorkletsModuleProxy with wrong hostRuntimeId. */
  JSIWorkletsModuleProxy(const JSIWorkletsModuleProxy &other) = delete;

  [[nodiscard]]
  jsi::Object toOptimizedObject(jsi::Runtime &rt) const;

  [[nodiscard]] std::shared_ptr<JSScheduler> getJSScheduler() const {
    return jsScheduler_;
  }

  [[nodiscard]] std::shared_ptr<UIScheduler> getUIScheduler() const {
    return uiScheduler_;
  }

  [[nodiscard]] bool isBundleModeEnabled() const {
    return bundleModeConfig_.enabled;
  }

  [[nodiscard]] bool isDevBundle() const {
    return isDevBundle_;
  }

  [[nodiscard]] std::shared_ptr<const ScriptBuffer> getScript() const {
    return bundleModeConfig_.script;
  }

  [[nodiscard]] std::string getSourceUrl() const {
    return bundleModeConfig_.sourceURL;
  }

  [[nodiscard]] std::shared_ptr<MemoryManager> getMemoryManager() const {
    return memoryManager_;
  }

  [[nodiscard]] std::shared_ptr<RuntimeManager> getRuntimeManager() const {
    return runtimeManager_;
  }

  [[nodiscard]] std::shared_ptr<RuntimeBindings> getRuntimeBindings() const {
    return runtimeBindings_;
  }

  [[nodiscard]] std::shared_ptr<UnpackerLoader> getUnpackerLoader() const {
    return unpackerLoader_;
  }

 private:
  const bool isDevBundle_;
  const BundleModeConfig bundleModeConfig_;
  const std::shared_ptr<JSScheduler> jsScheduler_;
  const std::shared_ptr<UIScheduler> uiScheduler_;
  const std::shared_ptr<MemoryManager> memoryManager_;
  const std::shared_ptr<RuntimeManager> runtimeManager_;
  const std::weak_ptr<WorkletRuntime> uiWorkletRuntime_;
  const std::shared_ptr<RuntimeBindings> runtimeBindings_;
  const std::shared_ptr<UnpackerLoader> unpackerLoader_;
  const RuntimeData::RuntimeId hostRuntimeId_;
};

} // namespace worklets
