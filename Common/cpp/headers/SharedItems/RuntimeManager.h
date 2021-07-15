#pragma once

#include "ShareableValue.h"
#include "ErrorHandler.h"
#include "Scheduler.h"
#include "WorkletsCache.h"
#include "RuntimeDecorator.h"
#include <jsi/jsi.h>
#include <memory>

namespace reanimated {

using namespace facebook;

/**
 A class that manages a jsi::Runtime apart from the React-JS runtime.
 */
class RuntimeManager {
public:
  RuntimeManager(
    std::shared_ptr<jsi::Runtime> runtime,
    std::shared_ptr<ErrorHandler> errorHandler,
    std::shared_ptr<Scheduler> scheduler,
    RuntimeType runtimeType = RuntimeType::Worklet
  ) : 
    runtime(runtime), 
    errorHandler(errorHandler), 
    scheduler(scheduler), 
    workletsCache(std::make_unique<WorkletsCache>()) 
  { 
    RuntimeDecorator::registerRuntime(this->runtime.get(), runtimeType);
  }
public:
  /**
   Holds the jsi::Function worklet that is responsible for updating values in JS.
   Can be null.
   */
  std::shared_ptr<ShareableValue> valueSetter;
  /**
   Holds the jsi::Runtime this RuntimeManager is managing.
   */
  std::shared_ptr<jsi::Runtime> runtime;
  /**
   Holds the error handler that will be invoked when any kind of error occurs.
   */
  std::shared_ptr<ErrorHandler> errorHandler;
  /**
   Holds the Scheduler that is responsible for scheduling work on the UI- or React-JS Thread.
   */
  std::shared_ptr<Scheduler> scheduler;
  /**
   Holds a list of adapted Worklets which are cached to avoid unneccessary recreation.
   */
  std::unique_ptr<WorkletsCache> workletsCache;
};

}
