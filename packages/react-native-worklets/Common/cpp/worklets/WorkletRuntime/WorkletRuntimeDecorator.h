#pragma once

#include <worklets/RunLoop/EventLoop.h>
#include <worklets/Tools/JSScheduler.h>
#ifdef WORKLETS_BUNDLE_MODE_ENABLED
#include <worklets/WorkletRuntime/RuntimeBindings.h>
#endif // WORKLETS_BUNDLE_MODE_ENABLED

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

#ifdef WORKLETS_BUNDLE_MODE_ENABLED
  static void postEvaluateScript(jsi::Runtime &rt, const std::shared_ptr<RuntimeBindings> &runtimeBindings);

 private:
#ifdef WORKLETS_FETCH_PREVIEW
  static void installNetworking(jsi::Runtime &rt, const std::shared_ptr<RuntimeBindings> &runtimeBindings);
#endif // WORKLETS_FETCH_PREVIEW
#endif // WORKLETS_BUNDLE_MODE_ENABLED
};

} // namespace worklets
