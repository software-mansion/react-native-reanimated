
#pragma once

#include <cxxreact/MessageQueueThread.h>
#include <react/renderer/uimanager/UIManagerBinding.h>
#include <react/renderer/uimanager/primitives.h>

#include <worklets/SharedItems/MemoryManager.h>
#include <worklets/SharedItems/Serializable.h>
#include <worklets/Tools/Defs.h>
#include <worklets/WorkletRuntime/RuntimeManager.h>
#include <worklets/WorkletRuntime/UIRuntimeDecorator.h>

#ifdef __ANDROID__
#include <fbjni/fbjni.h>
#endif // __ANDROID__

#include <jsi/jsi.h>

#include <memory>
#include <string>
#include <vector>

using namespace facebook;

namespace worklets {

class WorkletRuntime;

class JSIWorkletsModuleProxy : public jsi::HostObject {
 public:
  explicit JSIWorkletsModuleProxy(
      const bool isDevBundle,
      const std::shared_ptr<const JSBigStringBuffer> &script,
      const std::string &sourceUrl,
      const std::shared_ptr<MessageQueueThread> &jsQueue,
      const std::shared_ptr<JSScheduler> &jsScheduler,
      const std::shared_ptr<UIScheduler> &uiScheduler,
      const std::shared_ptr<MemoryManager> &memoryManager,
      const std::shared_ptr<RuntimeManager> &runtimeManager,
      const std::weak_ptr<WorkletRuntime> &uiWorkletRuntime);

  JSIWorkletsModuleProxy(const JSIWorkletsModuleProxy &other);

  ~JSIWorkletsModuleProxy() override;

  std::vector<jsi::PropNameID> getPropertyNames(jsi::Runtime &rt) override;

  jsi::Value get(jsi::Runtime &rt, const jsi::PropNameID &propName) override;

  [[nodiscard]] std::shared_ptr<MessageQueueThread> getJSQueue() const {
    return jsQueue_;
  }

  [[nodiscard]] std::shared_ptr<JSScheduler> getJSScheduler() const {
    return jsScheduler_;
  }

  [[nodiscard]] std::shared_ptr<UIScheduler> getUIScheduler() const {
    return uiScheduler_;
  }

  [[nodiscard]] bool isDevBundle() const {
    return isDevBundle_;
  }

  [[nodiscard]] std::shared_ptr<const JSBigStringBuffer> getScript() const {
    return script_;
  }

  [[nodiscard]] std::string getSourceUrl() const {
    return sourceUrl_;
  }

  [[nodiscard]] std::shared_ptr<MemoryManager> getMemoryManager() const {
    return memoryManager_;
  }

  [[nodiscard]] std::shared_ptr<RuntimeManager> getRuntimeManager() const {
    return runtimeManager_;
  }

 private:
  const bool isDevBundle_;
  const std::shared_ptr<const JSBigStringBuffer> script_;
  const std::string sourceUrl_;
  const std::shared_ptr<MessageQueueThread> jsQueue_;
  const std::shared_ptr<JSScheduler> jsScheduler_;
  const std::shared_ptr<UIScheduler> uiScheduler_;
  const std::shared_ptr<MemoryManager> memoryManager_;
  const std::shared_ptr<RuntimeManager> runtimeManager_;
  const std::weak_ptr<WorkletRuntime> uiWorkletRuntime_;
};

} // namespace worklets
