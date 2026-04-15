#pragma once

#include <worklets/RunLoop/EventLoop.h>
#include <worklets/Tools/JSScheduler.h>
#include <worklets/WorkletRuntime/RuntimeBindings.h>

#include <jsi/jsi.h>

#include <memory>
#include <string>

using namespace facebook;

namespace worklets {

class WorkletRuntimeDecorator {
 public:
  static void decorate(
      jsi::Runtime &rt,
      const std::string &name,
      const std::shared_ptr<JSScheduler> &jsScheduler,
      const bool isDevBundle,
      jsi::Object &&jsiWorkletsModuleProxy,
      const std::shared_ptr<EventLoop> &eventLoop);

  static void postEvaluateScript(jsi::Runtime &rt, const std::shared_ptr<RuntimeBindings> &runtimeBindings);

 private:
#ifdef WORKLETS_FETCH_PREVIEW_ENABLED
  static void installNetworking(jsi::Runtime &rt, const std::shared_ptr<RuntimeBindings> &runtimeBindings);
#endif // WORKLETS_FETCH_PREVIEW_ENABLED
};

} // namespace worklets
