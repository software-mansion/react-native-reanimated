#pragma once

#include <reanimated/CSS/common/values/CSSValue.h>

#include <folly/dynamic.h>
#include <jsi/jsi.h>
#include <memory>
#include <string>
#include <type_traits>
#include <vector>

namespace reanimated::css {

using namespace facebook;

template <typename TOperation>
concept ResolvableOp = requires(TOperation operation) {
  { operation.value } -> std::convertible_to<typename std::remove_reference_t<decltype(operation.value)>>;
  requires Resolvable<std::remove_reference_t<decltype(operation.value)>>;
}; // NOLINT(readability/braces)

struct StyleOperation {
  uint8_t type;

  explicit StyleOperation(uint8_t type);
  virtual ~StyleOperation() = default;

  bool operator==(const StyleOperation &other) const;
  folly::dynamic toDynamic() const;

  virtual std::string getOperationName() const = 0;
  virtual bool shouldResolve() const;

 protected:
  virtual folly::dynamic valueToDynamic() const = 0;
  virtual bool areValuesEqual(const StyleOperation &other) const = 0;
};

using StyleOperations = std::vector<std::shared_ptr<StyleOperation>>;

} // namespace reanimated::css
