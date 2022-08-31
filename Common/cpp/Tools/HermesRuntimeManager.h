#pragma once

#include <cxxreact/MessageQueueThread.h>
#include <jsi/jsi.h>

#if __has_include(<reacthermes/HermesExecutorFactory.h>)
#include <reacthermes/HermesExecutorFactory.h>
#else // __has_include(<hermes/hermes.h>) or ANDROID
#include <hermes/hermes.h>
#endif

#include <hermes/inspector/RuntimeAdapter.h>
#include <hermes/inspector/chrome/Registration.h>

namespace reanimated {

using namespace facebook;
using namespace react;

/** HermesRuntimeManager
 *
 * It is very important that this object exists as long as the app is running
 * and is destroyed before any reload or shutdown of the app. In more simple
 * terms: it should only exists as long as the ReanimatedNativeModule exists, so
 * it is easily done by keeping a reference (and the only one to be exact) to
 * this object inside ReanimatedNativeModule.
 *
 * When HERMES_ENABLE_DEBUGGER is set the destructor of this object disconnects
 * the runtime from the debugger. Failing to do so will crash the app.
 */

class HermesRuntimeManager {
 public:
  HermesRuntimeManager(
#if HERMES_ENABLE_DEBUGGER
      std::shared_ptr<MessageQueueThread> messageQueueThread
#endif
  );
  ~HermesRuntimeManager();
  std::shared_ptr<facebook::jsi::Runtime> getRuntime();

 private:
  std::shared_ptr<facebook::hermes::HermesRuntime> runtime_;
  facebook::hermes::HermesRuntime &hermesRuntime_;
};

} // namespace reanimated
