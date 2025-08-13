#pragma once

namespace reanimated::css {

/**
 * Base struct for decomposed transform types.
 *
 * All Decomposed structs must inherit from this and implement:
 * - interpolate(): Interpolate between two decomposed states
 * - recompose(): Reconstruct the original matrix from decomposed components
 */
template <typename Derived, typename MatrixType>
struct DecomposedTransform {
  virtual ~DecomposedTransform() = default;

  // Pure virtual methods that must be implemented
  virtual Derived interpolate(double progress, const Derived &other) const = 0;
  virtual MatrixType recompose() const = 0;
};

} // namespace reanimated::css
