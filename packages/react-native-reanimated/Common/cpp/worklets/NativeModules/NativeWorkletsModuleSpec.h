#pragma once

#include <ReactCommon/CallInvoker.h>
#include <ReactCommon/TurboModule.h>
#include <memory>

using namespace facebook;
using namespace react;

namespace worklets {

class JSI_EXPORT NativeWorkletsModuleSpec : public TurboModule {
 protected:
  explicit NativeWorkletsModuleSpec(
      const std::shared_ptr<CallInvoker> jsInvoker);
};

} // namespace worklets
