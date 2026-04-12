#pragma once

#include <memory>

namespace reanimated {

class LoopOperation : public std::enable_shared_from_this<LoopOperation> {
 public:
  virtual ~LoopOperation() = default;

  void update(double timestamp) {
    onUpdate(timestamp);
  }

  virtual bool isRunning() const = 0;

 protected:
  virtual void onUpdate(double timestamp) = 0;
};

} // namespace reanimated
