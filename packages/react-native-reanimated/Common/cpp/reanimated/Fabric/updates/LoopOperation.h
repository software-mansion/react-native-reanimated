#pragma once

namespace reanimated {

class LoopOperation {
 public:
  virtual ~LoopOperation() = default;

  // Tick the operation. Return true to keep it scheduled, false to remove.
  virtual bool update(double timestamp) = 0;
};

} // namespace reanimated
