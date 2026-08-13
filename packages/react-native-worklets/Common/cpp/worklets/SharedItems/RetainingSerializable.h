#pragma once

#include <jsi/jsi.h>
#include <worklets/Compat/StableApi.h>
#include <worklets/Registries/WorkletRuntimeRegistry.h>
#include <worklets/SharedItems/Serializable.h>
#include <worklets/Tools/JSScheduler.h>
#include <worklets/WorkletRuntime/RuntimeData.h>

#include <atomic>
#include <memory>
#include <mutex>
#include <utility>

namespace worklets {

template <typename BaseClass>
class RetainingSerializable : virtual public BaseClass {
 private:
  jsi::Runtime *primaryRuntime_;
  std::unique_ptr<jsi::Value> secondaryValue_;
  std::atomic<jsi::Runtime *> secondaryRuntime_{nullptr};
  std::mutex secondaryCacheMutex_;

 public:
  template <typename... Args>
  explicit RetainingSerializable(jsi::Runtime &rt, Args &&...args)
      : BaseClass(rt, std::forward<Args>(args)...), primaryRuntime_(&rt) {}

  jsi::Value toJSValue(jsi::Runtime &rt) override {
    if (&rt == primaryRuntime_) {
      return BaseClass::toJSValue(rt);
    }
    if (secondaryRuntime_.load(std::memory_order_acquire) == &rt) {
      return jsi::Value(rt, *secondaryValue_);
    }
    auto value = BaseClass::toJSValue(rt);
    {
      std::lock_guard<std::mutex> lock(secondaryCacheMutex_);
      if (secondaryRuntime_.load(std::memory_order_relaxed) == nullptr) {
        secondaryValue_ = std::make_unique<jsi::Value>(rt, value);
        secondaryRuntime_.store(&rt, std::memory_order_release);
      }
    }
    return value;
  }

  ~RetainingSerializable() override {
    cleanupRuntimeAware(secondaryRuntime_.load(std::memory_order_relaxed), secondaryValue_);
  }
};

}
