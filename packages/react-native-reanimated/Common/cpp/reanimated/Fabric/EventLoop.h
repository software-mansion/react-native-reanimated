#pragma once

#include <functional>
#include <memory>
#include <unordered_map>
#include <vector>

namespace reanimated {

class EventLoop {
 public:
  using Operation = std::function<bool(double timestamp)>;
  using OperationHandle = unsigned long;

  OperationHandle add(Operation operation);
  void remove(OperationHandle handle);

  void update(double timestamp);

 private:
  std::unordered_map<OperationHandle, Operation> operations_;
  OperationHandle nextHandle_{0};
};

} // namespace reanimated
