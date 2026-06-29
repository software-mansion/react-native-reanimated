#pragma once

#include <mutex>
#include <utility>

namespace worklets {

class RNRuntimeStatus {
 public:
  void setDead() {
    std::lock_guard<std::mutex> lock(mutex_);
    isDead_ = true;
  }

  template <typename Fn>
  void runWhileLocked(Fn &&fn) {
    std::lock_guard<std::mutex> lock(mutex_);
    std::forward<Fn>(fn)(isDead_);
  }

 private:
  bool isDead_ = false;
  std::mutex mutex_;
};

} // namespace worklets
