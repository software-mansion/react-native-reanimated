#pragma once

#include "HybridCounterSpec.hpp"

#include <atomic>
#include <functional>
#include <mutex>
#include <thread>
#include <unordered_map>

namespace margelo::nitro::withnitro {

class HybridCounter : public HybridCounterSpec {
 public:
  HybridCounter();
  ~HybridCounter() override;

  double getCount() override;
  double addListener(const std::function<void(double)> &listener) override;
  void removeListener(double id) override;

 protected:
  void loadHybridMethods() override;

 private:
  jsi::Value
  installUIRuntimeDispatcher(jsi::Runtime &rt, const jsi::Value &thisValue, const jsi::Value *args, size_t count);
  void countUntilStopped();

  std::mutex mutex_;
  int lastListenerId_ = 0;
  std::unordered_map<int, std::function<void(double)>> listeners_;
  std::atomic<int> count_{0};
  std::atomic<bool> isCounting_{true};
  std::thread counterThread_;
};

} // namespace margelo::nitro::withnitro
