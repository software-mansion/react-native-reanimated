#pragma once

#ifdef RCT_NEW_ARCH_ENABLED
#include <react/renderer/uimanager/UIManager.h>
#endif

#include <memory>
#include <string>
#include <unordered_set>
#include <utility>
#include <vector>

#include "CommonWorkletsModuleSpec.h"
#include "EventHandlerRegistry.h"
#include "JSLogger.h"
#include "JSScheduler.h"
#include "UIScheduler.h"

namespace reanimated {

class CommonWorkletsModule : public CommonWorkletsModuleSpec {
 public:
  CommonWorkletsModule(
      jsi::Runtime &rnRuntime,
      const std::shared_ptr<JSScheduler> &jsScheduler,
      const std::shared_ptr<MessageQueueThread> &jsQueue,
      const std::shared_ptr<UIScheduler> &uiScheduler,
      const std::string &valueUnpackerCode,
      const bool isBridgeless,
      const bool isReducedMotion);

  ~CommonWorkletsModule();

  jsi::Value makeShareableClone(
      jsi::Runtime &rt,
      const jsi::Value &value,
      const jsi::Value &shouldRetainRemote,
      const jsi::Value &nativeStateSource) override;

  void scheduleOnUI(jsi::Runtime &rt, const jsi::Value &worklet) override;
  jsi::Value executeOnUIRuntimeSync(jsi::Runtime &rt, const jsi::Value &worklet)
      override;

  jsi::Value createWorkletRuntime(
      jsi::Runtime &rt,
      const jsi::Value &name,
      const jsi::Value &initializer) override;
  jsi::Value scheduleOnRuntime(
      jsi::Runtime &rt,
      const jsi::Value &workletRuntimeValue,
      const jsi::Value &shareableWorkletValue) override;

  inline std::shared_ptr<JSLogger> getJSLogger() const {
    return jsLogger_;
  }

  inline std::shared_ptr<WorkletRuntime> getUIWorkletRuntime() const {
    return uiWorkletRuntime_;
  }

  inline jsi::Runtime &getUIRuntime() const {
    return uiWorkletRuntime_->getJSIRuntime();
  }

  inline const std::shared_ptr<JSScheduler> getJSScheduler() const {
    return jsScheduler_;
  }

  inline bool isBridgeless() const {
    return isBridgeless_;
  }

  inline bool isReducedMotion() const {
    return isReducedMotion_;
  }

  inline std::shared_ptr<CallInvoker> getJSCallInvoker() const {
    return jsScheduler_->getJSCallInvoker();
  }

  inline const std::shared_ptr<UIScheduler> getUIScheduler() const {
    return uiScheduler_;
  }

 private:
  void commonInit(jsi::Runtime &rnRuntime);

  const bool isBridgeless_;
  const bool isReducedMotion_;
  const std::shared_ptr<MessageQueueThread> jsQueue_;
  const std::shared_ptr<JSScheduler> jsScheduler_;
  const std::shared_ptr<UIScheduler> uiScheduler_;
  std::shared_ptr<WorkletRuntime> uiWorkletRuntime_;
  std::string valueUnpackerCode_;

  const std::shared_ptr<JSLogger> jsLogger_;
};

} // namespace reanimated
