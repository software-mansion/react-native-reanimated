#pragma once

#include <folly/dynamic.h>
#include <jsi/jsi.h>
#include <memory>
#include <type_traits>

namespace reanimated::css {

using namespace facebook;

template <typename TOperation>
concept ResolvableOp = requires(TOperation operation) {
  { operation.value } -> std::convertible_to<typename std::remove_reference_t<decltype(operation.value)>>;
  requires Resolvable<std::remove_reference_t<decltype(operation.value)>>;
}; // NOLINT(readability/braces)

struct StyleOperation {
  uint8_t type;

  explicit StyleOperation(uint8_t type) : type(type) {}

  virtual folly::dynamic valueToDynamic() const = 0;
  virtual std::string getOperationName() const = 0;
  virtual bool shouldResolve() const {
    return false;
  }
  folly::dynamic toDynamic() const {
    return folly::dynamic::object(getOperationName(), valueToDynamic());
  }
};

using StyleOperations = std::vector<std::shared_ptr<StyleOperation>>;

} // namespace reanimated::css
