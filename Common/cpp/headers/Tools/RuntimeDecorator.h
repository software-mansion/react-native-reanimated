#pragma once

#include "PlatformDepMethodsHolder.h"
#include <stdio.h>
#include <unordered_map>
#include <jsi/jsi.h>
#include "LayoutAnimationsProxy.h"

using namespace facebook;

namespace reanimated {

using RequestFrameFunction = std::function<void(std::function<void(double)>)>;

enum RuntimeType {
  /**
   Represents any runtime that supports the concept of workletization
   */
  Worklet,
  /**
   Represents the Reanimated UI worklet runtime specifically
   */
  UI
};
typedef jsi::Runtime* RuntimePointer;

class RuntimeDecorator {
public:
  static void decorateRuntime(jsi::Runtime &rt, const std::string &label);
  static void decorateUIRuntime(jsi::Runtime &rt,
                                const UpdaterFunction updater,
                                const RequestFrameFunction requestFrame,
                                const ScrollToFunction scrollTo,
                                const MeasuringFunction measure,
                                const TimeProviderFunction getCurrentTime,
                                std::shared_ptr<LayoutAnimationsProxy> layoutAnimationsProxy);
  
  /**
   Returns true if the given Runtime is the Reanimated UI-Thread Runtime.
   */
  inline static bool isUIRuntime(jsi::Runtime &rt);
  /**
   Returns true if the given Runtime is a Runtime that supports the concept of Workletization. (REA, Vision, ...)
   */
  inline static bool isWorkletRuntime(jsi::Runtime &rt);
  /**
   Returns true if the given Runtime is the default React-JS Runtime.
   */
  inline static bool isReactRuntime(jsi::Runtime &rt);
  /**
   Register the given Runtime. This function is required for every RuntimeManager, otherwise future runtime checks will fail.
   */
  static void registerRuntime(jsi::Runtime* runtime, RuntimeType runtimeType);

private:
  static std::unordered_map<RuntimePointer, RuntimeType> runtimeRegistry;
};

inline bool RuntimeDecorator::isUIRuntime(jsi::Runtime& rt) {
  auto iterator = runtimeRegistry.find(&rt);
  if (iterator == runtimeRegistry.end()) return false;
  return iterator->second == RuntimeType::UI;
}

inline bool RuntimeDecorator::isWorkletRuntime(jsi::Runtime& rt) {
  auto iterator = runtimeRegistry.find(&rt);
  if (iterator == runtimeRegistry.end()) return false;
  auto type = iterator->second;
  return type == RuntimeType::UI || type == RuntimeType::Worklet;
}

inline bool RuntimeDecorator::isReactRuntime(jsi::Runtime& rt) {
  auto iterator = runtimeRegistry.find(&rt);
  if (iterator == runtimeRegistry.end()) return true;
  return false;
}

}
