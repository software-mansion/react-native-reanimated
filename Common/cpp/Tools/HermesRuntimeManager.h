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
