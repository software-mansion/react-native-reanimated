#pragma once

#include <CppCounterSpecJSI.h>

#include <atomic>
#include <memory>
#include <thread>

#include "WorkletListeners.h"

namespace facebook::react {

class CppCounter : public NativeCppCounterCxxSpec<CppCounter> {
 public:
  explicit CppCounter(std::shared_ptr<CallInvoker> jsInvoker);
  ~CppCounter() override;

  double getCount(jsi::Runtime &rt);
  int addWorkletListener(
      jsi::Runtime &rt,
      jsi::Object uiRuntimeHolder,
      jsi::Object uiSchedulerHolder,
      jsi::Object worklet);
  void removeWorkletListener(jsi::Runtime &rt, int id);

 private:
  void countUntilStopped();

  std::atomic<int> count_{0};
  std::atomic<bool> isCounting_{true};
  WorkletListeners workletListeners_;
  std::thread counterThread_;
};

} // namespace facebook::react
