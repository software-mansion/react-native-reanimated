#include "CppCounter.h"

#include <chrono>

#ifdef __ANDROID__
#include <fbjni/fbjni.h>
#endif

namespace facebook::react {

CppCounter::CppCounter(std::shared_ptr<CallInvoker> jsInvoker)
    : NativeCppCounterCxxSpec(std::move(jsInvoker)), counterThread_([this] { countUntilStopped(); }) {}

CppCounter::~CppCounter() {
  isCounting_ = false;
  counterThread_.join();
}

double CppCounter::getCount(jsi::Runtime & /*rt*/) {
  return count_;
}

int CppCounter::addWorkletListener(
    jsi::Runtime &rt,
    jsi::Object uiRuntimeHolder,
    jsi::Object uiSchedulerHolder,
    jsi::Object worklet) {
  return workletListeners_.add(rt, uiRuntimeHolder, uiSchedulerHolder, worklet);
}

void CppCounter::removeWorkletListener(jsi::Runtime & /*rt*/, int id) {
  workletListeners_.remove(id);
}

void CppCounter::countUntilStopped() {
#ifdef __ANDROID__
  jni::ThreadScope attachedToJavaVM;
#endif
  while (isCounting_) {
    std::this_thread::sleep_for(std::chrono::milliseconds(16));
    workletListeners_.dispatch(++count_);
  }
}

} // namespace facebook::react
