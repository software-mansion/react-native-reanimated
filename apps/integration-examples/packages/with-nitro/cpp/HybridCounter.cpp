#include "HybridCounter.hpp"

#include <chrono>
#include <vector>

#ifdef __ANDROID__
#include <fbjni/fbjni.h>
#endif

#include "WorkletsUIDispatcher.hpp"

namespace margelo::nitro::withnitro {

HybridCounter::HybridCounter() : HybridObject(TAG), counterThread_([this] { countUntilStopped(); }) {}

HybridCounter::~HybridCounter() {
  isCounting_ = false;
  counterThread_.join();
}

void HybridCounter::loadHybridMethods() {
  HybridCounterSpec::loadHybridMethods();
  registerHybrids(this, [](Prototype &prototype) {
    prototype.registerRawHybridMethod("installUIRuntimeDispatcher", 2, &HybridCounter::installUIRuntimeDispatcher);
  });
}

jsi::Value HybridCounter::installUIRuntimeDispatcher(
    jsi::Runtime &rt,
    const jsi::Value & /*thisValue*/,
    const jsi::Value *args,
    size_t count) {
  if (count != 2) {
    throw jsi::JSError(rt, "[with-nitro] installUIRuntimeDispatcher() takes 2 arguments.");
  }
  WorkletsUIDispatcher::install(rt, args[0].asObject(rt), args[1].asObject(rt));
  return jsi::Value::undefined();
}

double HybridCounter::getCount() {
  return count_;
}

double HybridCounter::addListener(const std::function<void(double)> &listener) {
  std::lock_guard lock(mutex_);
  listeners_.emplace(++lastListenerId_, listener);
  return lastListenerId_;
}

void HybridCounter::removeListener(double id) {
  std::lock_guard lock(mutex_);
  listeners_.erase(static_cast<int>(id));
}

void HybridCounter::countUntilStopped() {
#ifdef __ANDROID__
  facebook::jni::ThreadScope attachedToJavaVM;
#endif
  while (isCounting_) {
    std::this_thread::sleep_for(std::chrono::milliseconds(16));
    const int count = ++count_;
    std::vector<std::function<void(double)>> listeners;
    {
      std::lock_guard lock(mutex_);
      for (const auto &[id, listener] : listeners_) {
        listeners.push_back(listener);
      }
    }
    for (const auto &listener : listeners) {
      listener(count);
    }
  }
}

} // namespace margelo::nitro::withnitro
