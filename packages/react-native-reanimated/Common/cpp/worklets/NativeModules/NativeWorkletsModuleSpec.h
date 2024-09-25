#pragma once

#include <ReactCommon/CallInvoker.h>
#include <ReactCommon/TurboModule.h>
#include <jsi/jsi.h>
#include <memory>

using namespace facebook;
using namespace react;

namespace reanimated {

class JSI_EXPORT NativeWorkletsModuleSpec : public TurboModule {
 protected:
  explicit NativeWorkletsModuleSpec(
      const std::shared_ptr<CallInvoker> jsInvoker);
};

} // namespace reanimated
