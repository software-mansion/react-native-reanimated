#pragma once

#include <folly/dynamic.h>
#include <jsi/jsi.h>
#include <memory>
#include <type_traits>

namespace reanimated::css {

using namespace facebook;

struct StyleOperation {
  size_t type;

  virtual bool operator==(const StyleOperation &other) const = 0;
  virtual folly::dynamic valueToDynamic() const = 0;
  virtual std::string getOperationName() const = 0;
  virtual bool shouldResolve() const {
    return false;
  }
  virtual folly::dynamic toDynamic() const = 0;

 protected:
  virtual bool areValuesEqual(const StyleOperation &other) const = 0;
};

using StyleOperations = std::vector<std::shared_ptr<StyleOperation>>;

} // namespace reanimated::css
