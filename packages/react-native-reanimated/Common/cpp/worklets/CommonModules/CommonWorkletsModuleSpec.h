#pragma once

#include <memory>
#include <string>
#include <vector>

#ifdef ANDROID
#include "TurboModule.h"
#else
#include <ReactCommon/TurboModule.h>
#endif

#include <ReactCommon/CallInvoker.h>

using namespace facebook;
using namespace react;

namespace reanimated {

class JSI_EXPORT CommonWorkletsModuleSpec : public TurboModule {
 protected:
  explicit CommonWorkletsModuleSpec(
      const std::shared_ptr<CallInvoker> jsInvoker);

 public:
  // SharedValue
  virtual jsi::Value makeShareableClone(
      jsi::Runtime &rt,
      const jsi::Value &value,
      const jsi::Value &shouldRetainRemote,
      const jsi::Value &nativeStateSource) = 0;

  // Scheduling
  virtual void scheduleOnUI(jsi::Runtime &rt, const jsi::Value &worklet) = 0;
  virtual jsi::Value executeOnUIRuntimeSync(
      jsi::Runtime &rt,
      const jsi::Value &worklet) = 0;

  // Worklet runtime
  virtual jsi::Value createWorkletRuntime(
      jsi::Runtime &rt,
      const jsi::Value &name,
      const jsi::Value &initializer) = 0;
  virtual jsi::Value scheduleOnRuntime(
      jsi::Runtime &rt,
      const jsi::Value &workletRuntimeValue,
      const jsi::Value &shareableWorkletValue) = 0;
};

} // namespace reanimated
