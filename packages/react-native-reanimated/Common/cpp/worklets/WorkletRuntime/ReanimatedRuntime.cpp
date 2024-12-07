#include <worklets/WorkletRuntime/ReanimatedRuntime.h>

#include <cxxreact/MessageQueueThread.h>
#include <jsi/jsi.h>

#include <memory>
#include <utility>

#if JS_RUNTIME_HERMES
#include <worklets/WorkletRuntime/ReanimatedHermesRuntime.h>
#elif JS_RUNTIME_V8
#include <v8runtime/V8RuntimeFactory.h>
#else
#include <jsc/JSCRuntime.h>
#endif // JS_RUNTIME

namespace worklets {

using namespace facebook;
using namespace react;

std::shared_ptr<jsi::Runtime> ReanimatedRuntime::make(
    jsi::Runtime &rnRuntime,
    const std::shared_ptr<MessageQueueThread> &jsQueue,
    const std::string &name) {
  (void)rnRuntime; // used only for V8
#if JS_RUNTIME_HERMES
  // Adapted from HermesExecutorFactory::createJSExecutor
  std::unique_ptr<HermesRuntime> hermesRuntime;
  {
    SystraceSection s("makeHermesRuntime");
    hermesRuntime = facebook::hermes::makeHermesRuntime();
    // TODO: pass runtimeConfig_
  }

  HermesRuntime& hermesRuntimeRef = *hermesRuntime;
  bool enableDebugger = true;
  // TODO: rename to ReanimatedDecoratedRuntime
  auto decoratedRuntime = std::make_shared<ReanimatedHermesRuntime>(
      std::move(hermesRuntime),
      hermesRuntimeRef,
      jsQueue,
      enableDebugger,
      "reanimated-runtime-make-1");

  auto errorPrototype =
      decoratedRuntime->global()
          .getPropertyAsObject(*decoratedRuntime, "Error")
          .getPropertyAsObject(*decoratedRuntime, "prototype");
  errorPrototype.setProperty(*decoratedRuntime, "jsEngine", "reanimated-runtime-make-2");

  return decoratedRuntime;
#elif JS_RUNTIME_V8
  (void)jsQueue;
  auto config = std::make_unique<rnv8::V8RuntimeConfig>();
  config->enableInspector = false;
  config->appName = name;
  return rnv8::createSharedV8Runtime(&rnRuntime, std::move(config));
#else
  (void)jsQueue;
  return facebook::jsc::makeJSCRuntime();
#endif
}

} // namespace worklets
