#include <reanimated/CSS/interpolation/operations/StyleOperation.h>

namespace reanimated::css {

StyleOperation::StyleOperation(uint8_t type) : type(type) {}

bool StyleOperation::operator==(const StyleOperation &other) const {
  return type == other.type && areValuesEqual(other);
}

folly::dynamic StyleOperation::toDynamic() const {
  return folly::dynamic::object(getOperationName(), valueToDynamic());
}

bool StyleOperation::shouldResolve() const {
  return false;
}

} // namespace reanimated::css
