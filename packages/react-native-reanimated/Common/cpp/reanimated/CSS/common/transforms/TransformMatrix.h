#pragma once

#include <reanimated/CSS/common/definitions.h>
#include <reanimated/CSS/common/transforms/DecomposedTransform.h>

#include <folly/dynamic.h>
#include <string>

namespace reanimated::css {

/**
 * Base template class for transform matrices.
 *
 * Derived classes must:
 * 1. Implement a Decomposed struct that inherits from DecomposedTransform<Decomposed, Derived>
 * 2. Implement all pure virtual methods
 * 3. Provide appropriate matrix storage
 */
template <typename Derived, typename MatrixType, typename DecomposedType>
class TransformMatrix {
 public:
  virtual ~TransformMatrix() = default;

  // Pure virtual methods that must be implemented by derived classes
  virtual std::string toString() const = 0;
  virtual folly::dynamic toDynamic() const = 0;
  virtual std::optional<DecomposedType> decompose() const = 0;

  // Virtual methods with default implementations that can be overridden
  virtual bool operator==(const Derived &other) const = 0;
  virtual Derived operator*(const Derived &rhs) const = 0;
  virtual Derived &operator*=(const Derived &rhs) = 0;

#ifndef NDEBUG
  virtual std::ostream &print(std::ostream &os) const = 0;
#endif // NDEBUG

 protected:
  // Protected constructor to prevent direct instantiation
  TransformMatrix() = default;
  TransformMatrix(const TransformMatrix &) = default;
  TransformMatrix(TransformMatrix &&) = default;
  TransformMatrix &operator=(const TransformMatrix &) = default;
  TransformMatrix &operator=(TransformMatrix &&) = default;
};

} // namespace reanimated::css
