#pragma once

#include <jsi/jsi.h>
#include <worklets/RunLoop/EventLoop.h>
#include <worklets/Tools/JSScheduler.h>
#include <worklets/WorkletRuntime/RuntimeBindings.h>
#include <worklets/WorkletRuntime/RuntimeData.h>

#include <memory>
#include <string>

using namespace facebook;

namespace worklets {

class WorkletRuntimeDecorator {
 public:
  static void decorate(
      jsi::Runtime &rt,
      const RuntimeData::RuntimeKind runtimeKind,
      const std::string &name,
      const std::shared_ptr<JSScheduler> &jsScheduler,
      const bool isDevBundle,
      const bool enableMicrotaskQueue,
      jsi::Object &&jsiWorkletsModuleProxy,
      const std::shared_ptr<EventLoop> &eventLoop,
      const RuntimeBindings::NativeLoggingHook &nativeLoggingHook);
};

} // namespace worklets
