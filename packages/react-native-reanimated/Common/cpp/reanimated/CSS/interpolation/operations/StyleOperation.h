#pragma once

#include <folly/dynamic.h>
#include <jsi/jsi.h>
#include <memory>
#include <type_traits>

namespace reanimated::css {

using namespace facebook;

struct StyleOperation {
  uint8_t type;

  explicit StyleOperation(uint8_t type) : type(type) {}

  virtual bool operator==(const StyleOperation &other) const = 0;
  virtual folly::dynamic valueToDynamic() const = 0;
  virtual std::string getOperationName() const = 0;
  virtual folly::dynamic valueToDynamic() const = 0;
  virtual bool shouldResolve() const {
    return false;
  }
  folly::dynamic toDynamic() const {
    return folly::dynamic::object(getOperationName(), valueToDynamic());
  }

 protected:
  virtual bool areValuesEqual(const StyleOperation &other) const = 0;
};

using StyleOperations = std::vector<std::shared_ptr<StyleOperation>>;

} // namespace reanimated::css
