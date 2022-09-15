// JS_RUNTIME_HERMES is only set on Android so we have to check __has_include
// on iOS.
#if (__has_include( \
         <reacthermes/HermesExecutorFactory.h>) || __has_include(<hermes/hermes.h>) || JS_RUNTIME_HERMES)
#define JS_RUNTIME_HERMES 1
#endif

#include "ReanimatedRuntime.h"

#include <cxxreact/MessageQueueThread.h>
#include <jsi/jsi.h>

#include <memory>
#include <utility>

#if JS_RUNTIME_HERMES
#include "ReanimatedHermesRuntime.h"
#elif JS_RUNTIME_V8
#include <v8runtime/V8RuntimeFactory.h>
#else
#include <jsi/JSCRuntime.h>
#endif

namespace reanimated {

using namespace facebook;
using namespace react;

std::shared_ptr<jsi::Runtime> ReanimatedRuntime::make(
    std::shared_ptr<MessageQueueThread> jsQueue) {
#if JS_RUNTIME_HERMES
  std::unique_ptr<facebook::hermes::HermesRuntime> runtime =
      facebook::hermes::makeHermesRuntime();
  facebook::hermes::HermesRuntime &hermesRuntime = *runtime;

  return std::make_shared<ReanimatedHermesRuntime>(
      std::move(runtime), hermesRuntime, jsQueue);
#elif JS_RUNTIME_V8
  jsQueue->quitSynchronous();

  auto config = std::make_unique<rnv8::V8RuntimeConfig>();
  config->enableInspector = false;
  config->appName = "reanimated";
  return rnv8::createSharedV8Runtime(runtime_, std::move(config));
#else
  jsQueue->quitSynchronous();

  return facebook::jsc::makeJSCRuntime();
#endif
}

} // namespace reanimated
