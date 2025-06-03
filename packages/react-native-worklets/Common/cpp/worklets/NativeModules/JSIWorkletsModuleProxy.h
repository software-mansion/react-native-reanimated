
#pragma once

#include <cxxreact/MessageQueueThread.h>
#include <react/renderer/uimanager/UIManagerBinding.h>
#include <react/renderer/uimanager/primitives.h>

#include <worklets/SharedItems/Shareables.h>
#include <worklets/Tools/Defs.h>
#include <worklets/Tools/JSScheduler.h>
#include <worklets/Tools/UIScheduler.h>

#ifdef __ANDROID__
#include <fbjni/fbjni.h>
#endif // __ANDROID__

#include <jsi/jsi.h>

#include <memory>
#include <vector>

using namespace facebook;

namespace worklets {

class WorkletRuntime;

class JSIWorkletsModuleProxy : public jsi::HostObject {
 public:
  explicit JSIWorkletsModuleProxy(
      const bool isDevBundle,
      const std::shared_ptr<MessageQueueThread> &jsQueue,
      const std::shared_ptr<JSScheduler> &jsScheduler,
      const std::shared_ptr<UIScheduler> &uiScheduler,
      std::shared_ptr<WorkletRuntime> uiWorkletRuntime);

  JSIWorkletsModuleProxy(const JSIWorkletsModuleProxy &other);

  ~JSIWorkletsModuleProxy() override;

  std::vector<jsi::PropNameID> getPropertyNames(jsi::Runtime &rt) override;

  jsi::Value get(jsi::Runtime &rt, const jsi::PropNameID &propName) override;

 private:
  const bool isDevBundle_;
  const std::shared_ptr<MessageQueueThread> jsQueue_;
  const std::shared_ptr<JSScheduler> jsScheduler_;
  const std::shared_ptr<UIScheduler> uiScheduler_;
  // TODO: Make it non-nullptr on the UI runtime.
  std::weak_ptr<WorkletRuntime> uiWorkletRuntime_;
};

} // namespace worklets
