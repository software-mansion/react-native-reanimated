#pragma once

#include <jsi/jsi.h>

#include <memory>

#include "JSScheduler.h"
#include "RuntimeDecorator.h"
#include "UIScheduler.h"

namespace reanimated {

using namespace facebook;

/**
 A class that manages a jsi::Runtime apart from the React-JS runtime.
 */
class RuntimeManager {
 public:
  RuntimeManager(
      std::shared_ptr<jsi::Runtime> runtime,
      std::shared_ptr<UIScheduler> uiScheduler,
      std::shared_ptr<JSScheduler> jsScheduler,
      RuntimeType runtimeType = RuntimeType::Worklet)
      : runtime(runtime), uiScheduler_(uiScheduler), jsScheduler_(jsScheduler) {
    RuntimeDecorator::registerRuntime(this->runtime.get(), runtimeType);
  }

  /**
   Holds the jsi::Runtime this RuntimeManager is managing.
   */
  std::shared_ptr<jsi::Runtime> runtime;
  /**
   Holds the UIScheduler that is responsible for scheduling work on the UI
   Thread.
   */
  std::shared_ptr<UIScheduler> uiScheduler_;
  /**
   Holds the JSScheduler that is responsible for scheduling work on the React-JS
   Thread.
   */
  std::shared_ptr<JSScheduler> jsScheduler_;
};

} // namespace reanimated
