#pragma once

#include <ReactCommon/CallInvoker.h>
#include <ReactCommon/TurboModule.h>
#include <memory>

using namespace facebook;
using namespace react;

namespace worklets {

class JSI_EXPORT WorkletsModuleProxySpec : public TurboModule {
 protected:
  explicit WorkletsModuleProxySpec(
      const std::shared_ptr<CallInvoker> jsInvoker);

 public:
  virtual jsi::Value makeShareableClone(
      jsi::Runtime &rt,
      const jsi::Value &value,
      const jsi::Value &shouldRetainRemote,
      const jsi::Value &nativeStateSource) = 0;
};

} // namespace worklets
