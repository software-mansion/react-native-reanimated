#pragma once

#include <ReactCommon/CallInvoker.h>
#include <ReactCommon/TurboModule.h>
#include <jsi/jsi.h>
#include <memory>

using namespace facebook;
using namespace react;

namespace worklets {

class JSI_EXPORT WorkletsModuleProxySpec : public TurboModule {
 protected:
  explicit WorkletsModuleProxySpec(
      const std::shared_ptr<CallInvoker> jsInvoker);

 public:
  // Shareables
  virtual jsi::Value makeShareableClone(
      jsi::Runtime &rt,
      const jsi::Value &value,
      const jsi::Value &shouldRetainRemote,
      const jsi::Value &nativeStateSource) = 0;

  virtual jsi::Value makeSynchronizable(
      jsi::Runtime &rt,
      const jsi::Value &value) = 0;

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

} // namespace worklets
