#include <worklets/Tools/Defs.h>
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
  auto runtime = facebook::hermes::makeHermesRuntime();
  return std::make_shared<ReanimatedHermesRuntime>(
      std::move(runtime), jsQueue, name);
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
