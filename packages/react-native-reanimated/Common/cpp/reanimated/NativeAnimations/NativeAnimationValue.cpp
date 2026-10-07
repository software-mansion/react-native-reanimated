#include <reanimated/NativeAnimations/NativeAnimationValue.h>

#include <cmath>

namespace reanimated::native_animation {

namespace {

struct FiniteVisitor {
  bool operator()(const double value) const {
    return std::isfinite(value);
  }
  bool operator()(const AnimationPoint &point) const {
    return std::isfinite(point.x) && std::isfinite(point.y);
  }
  bool operator()(const AnimationSize &size) const {
    return std::isfinite(size.width) && std::isfinite(size.height);
  }
  bool operator()(const AnimationColor &color) const {
    return std::isfinite(color.red) && std::isfinite(color.green) && std::isfinite(color.blue) &&
        std::isfinite(color.alpha);
  }
};

bool isClose(const double lhs, const double rhs, const double tolerance = ENDPOINT_TOLERANCE) {
  return std::abs(lhs - rhs) <= tolerance;
}

bool isLength(const TransformOperationKind kind) {
  return kind == TransformOperationKind::TranslateX || kind == TransformOperationKind::TranslateY ||
      kind == TransformOperationKind::Perspective;
}

facebook::react::Transform matrixOf(const AnimationTransformOperation &operation) {
  using facebook::react::Transform;
  const auto value = static_cast<facebook::react::Float>(operation.value);
  switch (operation.kind) {
    case TransformOperationKind::TranslateX:
      return Transform::Translate(value, 0, 0);
    case TransformOperationKind::TranslateY:
      return Transform::Translate(0, value, 0);
    case TransformOperationKind::Scale:
      return Transform::Scale(value, value, value);
    case TransformOperationKind::ScaleX:
      return Transform::Scale(value, 1, 1);
    case TransformOperationKind::ScaleY:
      return Transform::Scale(1, value, 1);
    case TransformOperationKind::RotateX:
      return Transform::RotateX(value);
    case TransformOperationKind::RotateY:
      return Transform::RotateY(value);
    case TransformOperationKind::RotateZ:
      return Transform::RotateZ(value);
    case TransformOperationKind::Perspective:
      return Transform::Perspective(value);
  }
}

struct SameValueVisitor {
  bool operator()(const double lhs, const double rhs) const {
    return isClose(lhs, rhs);
  }
  bool operator()(const AnimationPoint &lhs, const AnimationPoint &rhs) const {
    return isClose(lhs.x, rhs.x) && isClose(lhs.y, rhs.y);
  }
  bool operator()(const AnimationSize &lhs, const AnimationSize &rhs) const {
    return isClose(lhs.width, rhs.width) && isClose(lhs.height, rhs.height);
  }
  bool operator()(const AnimationColor &lhs, const AnimationColor &rhs) const {
    return isClose(lhs.red, rhs.red) && isClose(lhs.green, rhs.green) && isClose(lhs.blue, rhs.blue) &&
        isClose(lhs.alpha, rhs.alpha);
  }
  template <typename Lhs, typename Rhs>
  bool operator()(const Lhs &, const Rhs &) const {
    return false;
  }
};

} // namespace

bool isSameValue(const AnimationValue &lhs, const AnimationValue &rhs) {
  return std::visit(SameValueVisitor{}, lhs, rhs);
}

bool isSameOperationValue(const TransformOperationKind kind, const double lhs, const double rhs) {
  return isClose(lhs, rhs, isLength(kind) ? ENDPOINT_TOLERANCE : MATRIX_CELL_TOLERANCE);
}

facebook::react::Transform matrixOf(const AnimationTransform &transform) {
  facebook::react::Transform matrix;
  for (const auto &operation : transform.operations) {
    matrix = matrix * matrixOf(operation);
  }
  return matrix;
}

bool isSameMatrix(const facebook::react::Transform &lhs, const facebook::react::Transform &rhs) {
  constexpr size_t firstTranslationCell = 12;
  constexpr size_t lastTranslationCell = 14;
  for (size_t cell = 0; cell < lhs.matrix.size(); ++cell) {
    const bool isTranslation = cell >= firstTranslationCell && cell <= lastTranslationCell;
    if (!isClose(lhs.matrix[cell], rhs.matrix[cell], isTranslation ? ENDPOINT_TOLERANCE : MATRIX_CELL_TOLERANCE)) {
      return false;
    }
  }
  return true;
}

bool valueMatchesTarget(const AnimationValue &value, const AnimationTarget target) {
  switch (target) {
    case AnimationTarget::Position:
      return std::holds_alternative<AnimationPoint>(value);
    case AnimationTarget::Size:
    case AnimationTarget::ShadowOffset:
      return std::holds_alternative<AnimationSize>(value);
    case AnimationTarget::BackgroundColor:
    case AnimationTarget::BorderColor:
    case AnimationTarget::ShadowColor:
      return std::holds_alternative<AnimationColor>(value);
    case AnimationTarget::Opacity:
    case AnimationTarget::PositionX:
    case AnimationTarget::PositionY:
    case AnimationTarget::Width:
    case AnimationTarget::Height:
    case AnimationTarget::BorderRadius:
    case AnimationTarget::ShadowOpacity:
    case AnimationTarget::ShadowRadius:
      return std::holds_alternative<double>(value);
    case AnimationTarget::Transform:
      return false;
  }
  return false;
}

bool isFinite(const AnimationValue &value) {
  return std::visit(FiniteVisitor{}, value);
}

} // namespace reanimated::native_animation
