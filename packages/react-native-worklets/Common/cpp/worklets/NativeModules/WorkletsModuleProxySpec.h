#pragma once

#include <ReactCommon/CallInvoker.h>
#include <ReactCommon/TurboModule.h>
#include <memory>
#include <string>

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

  virtual jsi::Value makeShareableString(
      jsi::Runtime &rt,
      const jsi::String &string) = 0;

  virtual jsi::Value makeShareableNumber(jsi::Runtime &rt, double number) = 0;

  virtual jsi::Value makeShareableBoolean(jsi::Runtime &rt, bool boolean) = 0;

  virtual jsi::Value makeShareableBigInt(
      jsi::Runtime &rt,
      const jsi::BigInt &bigint) = 0;

  virtual jsi::Value makeShareableArray(
      jsi::Runtime &rt,
      const jsi::Array &array,
      const jsi::Value &shouldRetainRemote) = 0;

  virtual jsi::Value makeShareableObject(
      jsi::Runtime &rt,
      const jsi::Value &value,
      const jsi::Value &shouldRetainRemote,
      const jsi::Value &nativeStateSource) = 0;

  virtual jsi::Value makeShareableHostObject(
      jsi::Runtime &rt,
      const jsi::Value &value) = 0;

  virtual jsi::Value makeShareableInitializer(
      jsi::Runtime &rt,
      const jsi::Object &initializerObject) = 0;

  virtual jsi::Value makeShareableUndefined(jsi::Runtime &rt) = 0;

  virtual jsi::Value makeShareableNull(jsi::Runtime &rt) = 0;

  virtual jsi::Value makeShareableFunction(
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
