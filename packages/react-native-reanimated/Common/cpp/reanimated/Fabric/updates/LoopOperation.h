#pragma once

#include <functional>

namespace reanimated {

class LoopOperation {
 public:
  using OnUpdateCallback = std::function<void()>;

  virtual ~LoopOperation() = default;

  // Called by the loop each tick.
  void update(double timestamp) {
    onUpdate(timestamp);
    if (onUpdateCallback_) {
      onUpdateCallback_();
    }
  }

  virtual bool isRunning() const = 0;

  void setOnUpdateCallback(OnUpdateCallback callback) {
    onUpdateCallback_ = std::move(callback);
  }

 protected:
  virtual void onUpdate(double timestamp) = 0;

 private:
  OnUpdateCallback onUpdateCallback_;
};

} // namespace reanimated
